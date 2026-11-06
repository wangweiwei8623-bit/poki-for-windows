# Windows port notes

This is the port-notes document for the unofficial Windows build of Poki.
It records what changed, why, and what does **not** work. Upstream:
<https://github.com/JosssphZhou/poki> (AGPL-3.0-only).

## Scope

Upstream drives a physical iPhone through a Rust bridge (`native/`) that speaks
RemoteXPC to the device services, plus `xcrun` for the pieces the bridge does
not cover. None of that exists on Windows: there is no Xcode, no
`xcrun devicectl`, no Vision OCR helper and no simulator runtime.

This port keeps everything above the device layer 鈥?the MCP server, the tool
catalog, the coordination layer, the prompts 鈥?and replaces the device layer
with **WebDriverAgent over HTTP**, opened through go-ios.

| Layer | Upstream (macOS) | This port (Windows) |
| --- | --- | --- |
| Developer tunnel (iOS 17+) | Rust bridge / `pymobiledevice3` | `ios.exe tunnel start --userspace` |
| App launch / test session | `xcrun devicectl` | `ios.exe runwda` (testmanagerd) |
| Automation transport | Rust bridge 鈫?RemoteXPC | WebDriverAgent HTTP on `127.0.0.1:8100` |
| Screenshots | `idevice-tools screenshot` | WDA `/screenshot` |
| Accessibility tree | Rust bridge `ax` | WDA `/source?format=json` |
| Input | HID reports over the bridge | WDA `/wda/tap`, `/wda/keys`, 鈥?|
| Simulator, OCR, recording | yes | no |

## Why WebDriverAgent

WDA already exposes exactly the primitives Poki's bridge exposes 鈥?a tree, a
screenshot, taps in points, text input, hardware buttons, app launch 鈥?and it is
the one automation surface that works on Windows without Xcode. The bridge's
request/response contract is small, so a backend can implement it in ~240 lines
and nothing above it needs to know which transport is in use.

The trade-off is that a WDA session owns one app at a time and WDA cannot list
installed apps or read iOS settings; callers must pass a bundle id to
`launch_app`.

## The pipeline

```powershell
# 1. userspace tunnel; the info API is what runwda reads
ios.exe tunnel start --userspace            # info API: 127.0.0.1:28100

# 2. start the XCTest runner through testmanagerd
ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest

# 3. expose the device port
ios.exe forward 8100 8100

# 4. point Poki at it
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
node src\daemon.mjs --port 47825
```

`--bundleid` and `--testrunnerbundleid` are the signed runner's bundle id.
Sideloadly appends the team id to the upstream id, so the value looks like
`com.facebook.WebDriverAgentRunner.xctrunner.9AAY9CT487`; list installed apps
with `ios.exe apps` if you are unsure.

The tunnel info port defaults to **28100** in go-ios 1.3.x. If another service
already answers on the port `runwda` assumes, it fails with a 502 from an
unrelated listener 鈥?pass `--tunnel-info-port` explicitly if you change it.

## Code changes

| File | Change |
| --- | --- |
| `src/backends/wda.mjs` | **new.** WDA backend: session cache, screenshot-based scale, tree flattening, taps in points, keys, buttons, launch, screenshots. |
| `src/device.mjs` | select the WDA backend when `POKI_WDA_URL` is set: virtual inventory, `target()`, `bridge()`, `scale()`, `capture()`. |
| `src/daemon.mjs` | loopback-only listener, no `POKI_BIND_HOST`/`POKI_HOST_ALLOW`, token always generated, no local helper cleanup. |
| `src/platform.mjs` | `remoteRequest` naming, inlined app-termination matching. |
| `src/remote.mjs` | exports `remoteRequest`; local-helper lifecycle removed. |
| `src/batch.mjs`, `src/interaction.mjs`, `src/recording.mjs` | follow the renamed helper. |
| `src/data/tools.json` | tool descriptions for the WDA device (`wda` id). |
| `package.json` | description only; upstream version and dependencies unchanged. |

The complete diff against upstream is the `windows` branch itself: `git diff origin/main...windows`.

### Behaviour notes

- **One device.** `inventory()` returns a synthetic device with id `wda` and
  connection `USB`. Selecting a real UDID does nothing.
- **Coordinates.** Poki carries touches as normalized HID reports (0..65535);
  WDA wants points. The backend maps them onto the window size WDA reports, and
  derives the screenshot pixel ratio from a PNG header so the two agree.
- **Sessions.** WDA resets the app under test when a session is created, so one
  session is cached per base URL for the lifetime of the server.
- **Read-back.** WDA acknowledges keystrokes, not the resulting field value;
  `type_text` therefore reports `text_verified: false` and callers should read
  the tree back.
- **Daemon surface.** Upstream can bind multiple interfaces and validate Host
  headers for LAN clients. This port deliberately keeps the original
  single-listener, loopback-only behaviour; do not expose it without a proxy
  that adds authentication.

## Unsupported operations

`list_apps`, `configuration`, modifier-key chords, the simulator, screen
recording and the OCR helper return explicit errors from the WDA backend. They
are listed here so callers do not mistake a missing capability for a broken
device.

## Security posture

- The MCP endpoint binds to `127.0.0.1` only and requires
  `Authorization: Bearer <token>`.
- The token is 32 random bytes, written to `mcp.json` with user-only
  permissions (`0600` where the platform honours it).
- WDA itself has no authentication. `ios.exe forward 8100 8100` exposes it to
  every local process and, depending on the forwarder, potentially to the LAN.
  Keep the forward bound to loopback and stop it when you are done.
- A free Apple ID provisioning profile is valid for seven days; after expiry
  the runner will not launch until it is re-signed.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Failed looking up pid of launched process` | phone locked, or a system prompt (trust / passcode) is on screen | unlock, dismiss the prompt, retry |
| WDA session creation hangs | same as above; WDA waits for the app to become active | act on the phone, then retry |
| `web inspector is not enabled` | using `ios webinspector` | enable Settings 鈫?Safari 鈫?Advanced 鈫?Web Inspector, or stay on the WDA path |
| 502 from port 60105 | another service owns the port go-ios falls back to | pin the tunnel info port (28100) |
| Screenshot is 375脳812 but taps miss | stale scale cache | restart the server; the backend recomputes scale from the first screenshot |

## Verification

Recorded on 2026-11-06, Windows 11 x64, Node 24.22.1, go-ios 1.3.2,
iPhone 11 Pro / iOS 18.5, WDA 16.15.2:

- tunnel + forward: working
- `list_devices`: `iPhone (WebDriverAgent)`
- `take_screenshot`: 1125脳2436 PNG
- `list_elements`: full accessibility tree
- Safari launch + navigation: working

Input operations are implemented against the WDA endpoints but have not been
exercised in a recorded run; treat them as beta.

