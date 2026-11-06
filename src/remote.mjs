import { spawn } from 'node:child_process';
import { mkdir, readFile, lstat, unlink } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { root, stateDir } from './config.mjs';
import { checkWork, signal } from './work.mjs';

const starting = new Map();

export async function remoteDevices() {
  let configs;
  try { configs = JSON.parse(await readFile(join(stateDir, 'remote-devices.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  if (!Array.isArray(configs)) throw new Error('remote-devices.json must contain an array.');
  return configs.map(config => {
    if (typeof config.id !== 'string' || typeof config.config_path !== 'string' || !config.config_path.startsWith('/')) throw new Error('Invalid remote device configuration.');
    return { id: config.id, name: config.name ?? config.id, kind: 'physical', connection: 'RemotePairing', remote: config.config_path };
  });
}

function connect(path) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    socket.once('error', reject);
    socket.once('connect', () => resolve(socket));
  });
}

async function socketFor(target) {
  // macOS Unix socket names are limited to 104 bytes, regardless of the state directory's length.
  const directory = `/tmp/poki-remote-${process.getuid()}`;
  await mkdir(directory, { mode: 0o700, recursive: true });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) throw new Error('Remote socket directory must be private and owned by this user.');
  const path = join(directory, createHash('sha256').update(target.remote).digest('hex').slice(0, 24) + '.sock');
  try { return await connect(path); }
  catch (error) { if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error; }
  if (!starting.has(path)) {
    const started = (async () => {
      try {
        const stale = await lstat(path);
        if (!stale.isSocket() || stale.uid !== process.getuid()) throw new Error('Unexpected file at the remote socket path.');
        await unlink(path);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const child = spawn(join(root, 'build/poki-native'), ['--remote-server', target.remote, path], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = createInterface({ input: child.stdout });
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { child.kill(); reject(new Error('Remote helper did not start.')); }, 5000);
          const done = (error) => { clearTimeout(timer); error ? reject(error) : resolve(); };
          child.once('error', () => done(new Error('Cannot start remote helper. Run bin/setup.')));
          child.once('exit', () => done(new Error('Remote helper stopped before becoming ready.')));
          lines.once('line', line => { if (line === '{"ready":true}') done(); else done(new Error('Invalid remote helper greeting.')); });
        });
      } finally { lines.close(); child.stdout.destroy(); child.unref(); }
    })();
    starting.set(path, started);
    started.finally(() => starting.delete(path)).catch(() => {});
  }
  await starting.get(path);
  return connect(path);
}

export async function remoteRequest(target, request) {
  checkWork();
  const callerSignal = signal();
  const socket = await socketFor(target);
  try { checkWork(); } catch (error) { socket.destroy(); throw error; }
  return new Promise((resolve, reject) => {
    const lines = createInterface({ input: socket });
    let pid, outcome, abortReason;
    const abort = reason => {
      abortReason = reason;
      socket.destroy();
    };
    const onAbort = () => abort(callerSignal.reason);
    const timer = setTimeout(() => abort(new DOMException('Remote operation timed out; inspect before retrying input.', 'TimeoutError')), 120000);
    callerSignal?.addEventListener('abort', onAbort, { once: true });
    lines.on('line', line => {
      if (abortReason) return;
      let value;
      try { value = JSON.parse(line); } catch { abort(new Error('Invalid remote helper response. Inspect before retrying input.')); return; }
      if (!pid) {
        if (!Number.isSafeInteger(value.pid) || value.pid <= 1) { abort(new Error('Invalid remote helper identity.')); return; }
        pid = value.pid;
        if (callerSignal?.aborted) { abort(callerSignal.reason); return; }
        socket.write(JSON.stringify(request) + '\n');
      } else { outcome = value; socket.end(); }
    });
    socket.on('error', () => { abortReason ??= new Error('Remote connection closed. Input may have been delivered; inspect before retrying.'); });
    socket.once('close', () => {
      clearTimeout(timer); lines.close();
      callerSignal?.removeEventListener('abort', onAbort);
      if (abortReason) reject(abortReason);
      else if (!outcome) reject(new Error('Remote helper closed without confirming the action. Inspect before retrying input.'));
      else if (outcome.transport_error) reject(new Error(outcome.error ?? 'Remote operation failed.'));
      else resolve(outcome);
    });
  });
}
