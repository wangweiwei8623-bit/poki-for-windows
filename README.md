<p align="center">
  <img src="docs/images/poki-icon.png" width="72" height="72" alt="Poki icon">
</p>

<h1 align="center">Poki for Windows</h1>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--only-blue" alt="License: AGPL-3.0-only"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20iOS-lightgrey" alt="Platform: Windows and iOS">
</p>

**Control a real iPhone from an MCP agent on a Windows host - no Mac, no Xcode,
no jailbreak, no extra hardware.** Poki exposes the iPhone's accessibility tree
and touch/keyboard input to any MCP client through a local server, so an agent
operates the phone the way you do.

> This repository is an **unofficial Windows port** of
> [JosssphZhou/poki](https://github.com/JosssphZhou/poki). Upstream targets macOS
> and talks to the phone through a Rust bridge built with Xcode tooling. On
> Windows there is no Xcode, so this port replaces that device layer with
> **go-ios + WebDriverAgent over HTTP** and leaves the MCP server, tools and
> prompts untouched. The port notes are in [WINDOWS.md](WINDOWS.md).
>
> This is a standalone fork: the Windows work is **not** intended to be merged upstream.
> Please open issues and pull requests here, not in the upstream repository.

## How it works

```text
MCP client (Aidi, Claude Code, Codex, ...)
        |  streamable HTTP + bearer token, 127.0.0.1 only
        v
Poki MCP server  (Node.js 24, src/daemon.mjs)
        |  POKI_WDA_URL=http://127.0.0.1:8100
        v
WebDriverAgent (XCUITest runner signed onto the iPhone)
        ^
        |  XCTest / testmanagerd over the iOS 17+ developer tunnel
go-ios  (userspace tunnel on 28100, `ios forward` for 8100)
        |  USB
        v
iPhone
```

Three pieces replace the Mac:

1. **go-ios** opens the iOS 17+ developer tunnel and starts WebDriverAgent
   through `testmanagerd` - the same path Xcode uses, without Xcode.
2. **WebDriverAgent** is signed and installed once with a free Apple ID
   (Sideloadly does the signing on Windows), then driven over plain HTTP.
3. **Poki** gains a third device backend, [src/backends/wda.mjs](src/backends/wda.mjs),
   selected by `POKI_WDA_URL`. Every tool keeps its upstream request/response
   shape, so nothing above the backend changes.

## Requirements

- Windows 10/11 x64
- Node.js 24+
- Apple mobile-device drivers (iTunes or Apple Devices; Sideloadly installs its
  own `usbmuxd`, which go-ios also uses)
- [go-ios](https://github.com/danielpaulus/go-ios) 1.3.x (`ios.exe`)
- [Sideloadly](https://sideloadly.io/) + any free Apple ID, to sign WebDriverAgent
- An iPhone on iOS 17+ with Developer Mode on, connected over USB

## Quick start

```powershell
git clone https://github.com/wangweiwei8623-bit/poki-for-windows.git
cd poki-for-windows
npm ci

# 1. sign and install WebDriverAgent once (Sideloadly, see docs/install-windows.md)
# 2. open the developer tunnel
.\goios\ios.exe tunnel start --userspace

# 3. start WebDriverAgent (keep this window open)
.\goios\ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest

# 4. expose WDA on 8100
.\goios\ios.exe forward 8100 8100

# 5. start the MCP server
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
$env:POKI_MCP_STATE_DIR = "$env:USERPROFILE\Library\Application Support\PokiMCP"
node src\daemon.mjs --port 47825
```

The server writes its endpoint and bearer token to
`%USERPROFILE%\Library\Application Support\PokiMCP\mcp.json` (override with
`POKI_MCP_STATE_DIR`). Point your MCP client at that URL, or register the stdio
bridge: `node src\stdio.mjs`.

Check it:

```powershell
node bin/call.mjs list_devices
```

`list_devices` reports a single device, `iPhone (WebDriverAgent)`, whose id is
`wda`.

## What the WDA backend supports

| Operation | Status |
| --- | --- |
| `list_devices`, `get_device_info` | works (one virtual device, `wda`) |
| `take_screenshot`, screen scale | works - scale is derived from the WDA screenshot |
| `list_elements` (accessibility tree) | works |
| `tap`, `double_tap`, `long_press`, `swipe`/`drag`, `pinch` | implemented |
| `type_text`, `press_key` (Return / Backspace) | implemented |
| `press_button` (Home, volume) | implemented |
| `launch_app` by bundle id | implemented |
| `list_apps`, `configuration`, modifier keys | not exposed by WDA |
| iOS Simulator, screen recording, OCR helper | not available on this port |

## Verified on real hardware

Host: Windows 11 x64, Node.js 24.22.1, go-ios 1.3.2.
Device: iPhone 11 Pro, iOS 18.5, WebDriverAgent 16.15.2.

| Check | Result |
| --- | --- |
| Developer tunnel + `ios forward 8100` | works |
| `list_devices` -> `iPhone (WebDriverAgent)` | works |
| `take_screenshot` | works (1125 x 2436 PNG) |
| `list_elements` / WDA `source` | works |
| Launch Safari and navigate to a URL | works |
| `tap` / `type_text` | implemented, not yet exercised in a recorded run |

## Known limitations

- **Seven-day signature.** A free Apple ID signs WebDriverAgent for seven days;
  after that the app must be re-signed and reinstalled.
- **The phone must be unlocked.** With the screen locked, app launches and
  sessions fail; the port cannot unlock a passcode-protected phone.
- **One device.** The WDA backend exposes exactly one device per server.
- **No simulator, no OCR.** The macOS-only helpers are skipped; observation
  relies on the accessibility tree and screenshots.
- **Daemon is loopback-only.** This port simplified upstream's
  `POKI_BIND_HOST`/`POKI_HOST_ALLOW` multi-bind logic to a single `127.0.0.1`
  listener.

## Docs

| Topic | Read |
| --- | --- |
| Port notes, code changes, differences from upstream | [WINDOWS.md](WINDOWS.md) |
| Full Windows installation | [docs/install-windows.md](docs/install-windows.md) |
| Upstream concepts and tool reference | [docs/tools.md](docs/tools.md), [docs/physical-iphone.md](docs/physical-iphone.md) |

## Security

Poki drives your real iPhone: it can tap, type, send messages and open apps.
Screen contents are sent to your configured model service. The MCP endpoint
binds to `127.0.0.1` and requires a 32-byte bearer token written to `mcp.json`
with user-only permissions. Treat that token like a password.

## License and provenance

AGPL-3.0-only, inherited from upstream. This is a modified fork; see
[NOTICE.md](NOTICE.md) for what changed and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
for bundled dependencies.

Upstream: <https://github.com/JosssphZhou/poki> / <https://poki.bot>
