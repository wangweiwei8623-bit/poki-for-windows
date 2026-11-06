# Agent guide — Poki for Windows

This file tells an AI agent how to install and verify this repository on a
Windows host. It replaces upstream's macOS-only installation guide.

## Before you start

Confirm with the user:

1. Windows 10/11 x64, Node.js 24+, and a USB-connected iPhone on iOS 17+.
2. Developer Mode enabled on the phone, and UI Automation enabled under
   Settings → Developer.
3. A free Apple ID the user can sign in with **on the phone-owning machine**.
   Never ask for the password in chat; the user types it into Sideloadly.

## Steps

1. `npm ci` in the repository root.
2. Verify `ios.exe list` shows the phone's UDID. If not, stop and ask the user
   to unlock the phone and accept "Trust This Computer".
3. **STOP** until the user has signed and installed WebDriverAgent with
   Sideloadly (docs/install-windows.md, step 3). Read the installed bundle id
   back with `ios.exe apps | findstr WebDriverAgent`; Sideloadly appends the
   team id.
4. Start three long-running processes and keep them alive:
   `ios.exe tunnel start --userspace`, then
   `ios.exe runwda --bundleid=... --testrunnerbundleid=... --xctestconfig=WebDriverAgentRunner.xctest`,
   then `ios.exe forward 8100 8100`.
5. Wait for `curl.exe -s http://127.0.0.1:8100/status` to report
   `"ready": true`. A locked phone makes this fail — ask the user to unlock it.
6. Start the server with `POKI_WDA_URL=http://127.0.0.1:8100` and
   `POKI_MCP_STATE_DIR=%USERPROFILE%\Library\Application Support\PokiMCP`,
   then `node src\daemon.mjs --port 47825`. Wait for the `ready` log line.
7. Verify with `node bin\call.mjs list_devices`: exactly one device, id `wda`,
   name `iPhone (WebDriverAgent)`.
8. Report what was verified and what was not. `tap`/`type_text` are implemented
   but not yet covered by a recorded run.

## Rules

- Never print the token from `mcp.json`.
- The server binds to `127.0.0.1` only; do not expose it to a network.
- Free Apple ID signatures expire after seven days; if `runwda` starts failing,
  re-sign before debugging anything else.
