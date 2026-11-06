// A WebDriverAgent endpoint as a third device backend. iOS cloud devices, real-device farms and
// Appium hosts all expose WDA, and it covers the same operations the native bridge does, so an
// operator who has no iPhone on the desk can still drive one.
//
// Selected with POKI_WDA_URL (e.g. http://cloud-phone.example:8100). Every operation keeps the
// native bridge's request and response shapes, so nothing above this file changes.

const TIMEOUT_MS = 90_000;
const TOUCH_HOLD_MS = 120;

/** The configured WDA base URL, or null when the native bridge is the backend. */
export function wdaBase() {
  const raw = process.env.POKI_WDA_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

const sessions = new Map();

async function call(base, pathname, { method = 'GET', body, timeout = TIMEOUT_MS } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new Error(`WDA returned non-JSON from ${pathname}: ${text.slice(0, 300)}`); }
  if (!response.ok) {
    const reason = json?.value?.error ?? json?.value?.message ?? text.slice(0, 300);
    throw new Error(`WDA ${method} ${pathname} failed (HTTP ${response.status}): ${reason}`);
  }
  return json;
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('WDA screenshot was not a PNG.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Capabilities a hosted pool needs to pick a device: POKI_WDA_CAPABILITIES as a JSON object. */
function extraCapabilities() {
  const raw = process.env.POKI_WDA_CAPABILITIES?.trim();
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('POKI_WDA_CAPABILITIES must be a JSON object of capabilities.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('POKI_WDA_CAPABILITIES must be a JSON object of capabilities.');
  return parsed;
}

/** One session per base URL: creating a session resets the app under test, so it is created once. */
async function session(base) {
  const cached = sessions.get(base);
  if (cached) return cached;
  const match = { 'appium:automationName': 'XCUITest', ...extraCapabilities() };
  const created = await call(base, '/session', { method: 'POST', body: { capabilities: { alwaysMatch: match, firstMatch: [{}] } } });
  const id = created.sessionId ?? created.value?.sessionId;
  if (!id) throw new Error('WDA did not return a session id.');
  const size = (await call(base, `/session/${id}/window/size`)).value ?? {};
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) throw new Error('WDA did not report the window size, so touch coordinates cannot be mapped.');
  const record = { id, width: size.width, height: size.height, scale: null };
  sessions.set(base, record);
  return record;
}

/** Screen scale: the screenshot is in pixels, WDA coordinates are in points. */
async function scale(base, active) {
  if (active.scale) return active.scale;
  const shot = Buffer.from((await call(base, '/screenshot')).value, 'base64');
  const pixels = pngSize(shot);
  const value = pixels.width / active.width;
  if (!Number.isFinite(value) || value <= 0 || value > 5) throw new Error('Could not derive the screen scale from WDA, refusing to guess touch coordinates.');
  active.scale = value;
  return value;
}

// The native bridge carries touches as normalized HID reports (0..65535); WDA takes points.
function points(active, x, y) {
  if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x > 65535 || y > 65535) throw new Error('Touch coordinates must be normalized HID reports (0..65535).');
  return {
    x: Math.round(x / 65535 * (active.width - 1)),
    y: Math.round(y / 65535 * (active.height - 1)),
  };
}

function elements(source, includeOffscreen) {
  const flat = [];
  const visit = (node, parent, depth) => {
    if (!node || typeof node !== 'object') return;
    const frame = node.rect ?? node.frame ?? {};
    const width = frame.width ?? 0;
    const height = frame.height ?? 0;
    const offscreen = Boolean(node.isVisible === false || width <= 0 || height <= 0);
    if (includeOffscreen || !offscreen) {
      flat.push({
        object_id: node.identifier || `${node.type ?? 'element'}-${flat.length}`,
        parent,
        depth,
        role: node.type ?? null,
        type: node.type ?? null,
        label: node.label ?? null,
        value: node.value ?? null,
        identifier: node.identifier || null,
        placeholder: node.placeholderValue ?? null,
        title: node.name ?? null,
        enabled: node.isEnabled ?? null,
        selected: node.isSelected ?? null,
        focused: node.hasFocus ?? null,
        frame: { x: frame.x ?? 0, y: frame.y ?? 0, width, height },
        children: Array.isArray(node.children) ? node.children.length : 0,
      });
    }
    const index = flat.length - 1;
    for (const child of node.children ?? []) visit(child, offscreen ? parent : index, depth + 1);
  };
  visit(source, -1, 0);
  return flat;
}

/**
 * Run one native-bridge operation through WDA.
 * @param {{id: string}} target the selected device, used only for its id
 * @param {Record<string, unknown>} request a native bridge request, shaped as native/NATIVE.md documents
 */
export async function wdaRequest(target, request) {
  const base = wdaBase();
  if (!base) throw new Error('POKI_WDA_URL is not set.');
  const active = await session(base);
  const sessionPath = `/session/${active.id}`;

  switch (request.op) {
    case 'info':
    case 'display_info':
      return { op: request.op, device: target?.id ?? base, width: active.width, height: active.height, scale: await scale(base, active) };

    case 'ax':
    case 'ax_tree': {
      const tree = (await call(`${base}`, `${sessionPath}/source?format=json`)).value ?? {};
      const app = tree.name ?? tree.label ?? null;
      return { op: 'ax_tree', source: 'accessibility', foreground_app: app, orientation: tree.orientation ?? null, elements: elements(tree, Boolean(request.include_offscreen)) };
    }

    case 'tap':
    case 'long_press':
    case 'double_tap': {
      const point = points(active, request.x, request.y);
      const hold = request.op === 'long_press' ? Number(request.duration_ms) || 600 : Number(request.duration_ms) || 50;
      if (request.op === 'double_tap') {
        for (let index = 0; index < 2; index++) {
          await call(base, `${sessionPath}/wda/tap/0`, { method: 'POST', body: point });
          if (index === 0) await new Promise((resolve) => setTimeout(resolve, 80));
        }
        return { op: request.op, sent: true, screen_change_verified: false, x: point.x, y: point.y };
      }
      if (hold > TOUCH_HOLD_MS) {
        await call(base, `${sessionPath}/wda/touchAndHold`, { method: 'POST', body: { ...point, duration: hold / 1000 } });
      } else {
        await call(base, `${sessionPath}/wda/tap/0`, { method: 'POST', body: point });
      }
      return { op: request.op, sent: true, screen_change_verified: false, x: point.x, y: point.y };
    }

    case 'drag': {
      const from = points(active, request.x1, request.y1);
      const to = points(active, request.x2, request.y2);
      await call(base, `${sessionPath}/wda/dragfromtoforduration`, {
        method: 'POST',
        body: { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, duration: (Number(request.duration_ms) || 500) / 1000 },
      });
      return { op: 'drag', sent: true, screen_change_verified: false };
    }

    case 'pinch': {
      const start = Number(request.start_distance) || 1;
      const end = Number(request.end_distance) || start;
      const duration = Math.max(0.1, (Number(request.duration_ms) || 500) / 1000);
      await call(base, `${sessionPath}/wda/pinch`, { method: 'POST', body: { scale: end / start, velocity: Math.abs(end - start) / duration } });
      return { op: 'pinch', sent: true, screen_change_verified: false };
    }

    case 'type_text': {
      const text = String(request.text ?? '');
      if (request.clear) {
        const target0 = await call(base, `${sessionPath}/element/active`).catch(() => null);
        if (target0?.value?.ELEMENT) await call(base, `${sessionPath}/element/${target0.value.ELEMENT}/clear`, { method: 'POST', body: {} });
        else await call(base, `${sessionPath}/wda/keys`, { method: 'POST', body: { value: Array(50).fill('\b') } });
      }
      if (text) await call(base, `${sessionPath}/wda/keys`, { method: 'POST', body: { value: [text] } });
      if (request.submit) await call(base, `${sessionPath}/wda/keys`, { method: 'POST', body: { value: ['\n'] } });
      // WDA acknowledges the keystrokes, not the field's value; the caller must read it back.
      return { op: 'type_text', sent: true, text_verified: false, submitted: false, submit_sent: Boolean(request.submit) };
    }

    case 'key': {
      const key = String(request.key ?? '');
      const bare = key.toLowerCase();
      if (bare === 'return' || bare === 'enter') {
        await call(base, `${sessionPath}/wda/keys`, { method: 'POST', body: { value: ['\n'] } });
        return { op: 'key', sent: true, screen_change_verified: false };
      }
      if (bare === 'delete' || bare === 'backspace') {
        await call(base, `${sessionPath}/wda/keys`, { method: 'POST', body: { value: ['\b'] } });
        return { op: 'key', sent: true, screen_change_verified: false };
      }
      throw new Error(`WDA has no modifier-key report, so key ${JSON.stringify(key)} cannot be sent; use type_text or press_button.`);
    }

    case 'button': {
      const name = String(request.button ?? 'home');
      const map = { home: 'home', lock: 'home', power: 'home', volume_up: 'volumeUp', volume_down: 'volumeDown', mute: 'volumeUp' };
      const wdaName = map[name];
      if (!wdaName) throw new Error(`WDA does not expose the ${JSON.stringify(name)} button.`);
      await call(base, `${sessionPath}/wda/pressButton`, { method: 'POST', body: { name: wdaName } });
      return { op: 'button', sent: true, screen_change_verified: false };
    }

    case 'launch_app': {
      const bundle = request.bundle_id;
      if (!bundle) throw new Error('launch_app needs bundle_id over WDA; name lookup uses the device AppService, which WDA does not expose.');
      await call(base, `${sessionPath}/wda/apps/launch`, { method: 'POST', body: { bundleId: String(bundle) } });
      return { op: 'launch_app', launched: true, bundle_id: String(bundle) };
    }

    case 'screenshot': {
      const shot = (await call(base, '/screenshot')).value;
      const { writeFile } = await import('node:fs/promises');
      await writeFile(String(request.path), Buffer.from(shot, 'base64'), { mode: 0o600 });
      return { op: 'screenshot', path: String(request.path) };
    }

    case 'list_apps':
      throw new Error('list_apps reads the device AppService, which WDA does not expose; pass bundle_id to launch_app instead.');

    case 'configuration':
      throw new Error('configuration reads iOS accessibility settings through the native bridge, which WDA does not expose.');

    default:
      throw new Error(`The WDA backend does not implement op ${JSON.stringify(request.op)}.`);
  }
}
