# Install Poki for Windows

End-to-end setup on a Windows 10/11 machine with a USB-connected iPhone.
Budget 30–45 minutes the first time; most of it is Apple signing.

```text
iPhone ──USB──► go-ios tunnel ──► WebDriverAgent (8100) ──► Poki MCP (47825) ──► your MCP client
```

## 1. Prerequisites

| Item | Notes |
| --- | --- |
| Windows 10/11 x64 | verified on Windows 11 |
| Node.js 24+ | `node -v` |
| Apple mobile-device drivers | iTunes or Apple Devices; Sideloadly also ships a working `usbmuxd` |
| go-ios 1.3.x | download `go-ios-win.zip` from the [releases page](https://github.com/danielpaulus/go-ios/releases) |
| Sideloadly | <https://sideloadly.io/> |
| A free Apple ID | used only to sign WebDriverAgent; no developer program needed |
| iPhone, iOS 17+ | Developer Mode must be enabled |

Put `ios.exe` somewhere stable, for example `C:\tools\go-ios\ios.exe`.

```powershell
git clone https://github.com/<you>/poki-for-windows.git
cd poki-for-windows
npm ci
```

## 2. Prepare the iPhone

On the phone:

1. **Settings → Privacy & Security → Developer Mode → On**, then restart and
   confirm when prompted.
2. **Settings → Developer → Enable UI Automation** (iOS 17+).
3. Connect the cable, unlock the phone, and tap **Trust** on the
   "Trust This Computer?" prompt.

Check the host can see it:

```powershell
ios.exe list
# {"deviceList":["00008020-000218100C90003A"]}
```

If the list is empty, the phone is locked, the cable is charge-only, or the
Apple driver is missing.

## 3. Sign and install WebDriverAgent

WebDriverAgent is an XCTest runner. It has to be signed with your Apple ID and
installed like an app.

**Get the runner:**

```powershell
ios.exe ui download wda --output=C:\tools\wda
```

This prints an `appPath` such as
`C:\tools\wda\WebDriverAgentRunner-<stamp>\WebDriverAgentRunner-Runner.app`.

**Pack it as an IPA** (Sideloadly takes `.ipa`):

```powershell
$app = 'C:\tools\wda\WebDriverAgentRunner-<stamp>\WebDriverAgentRunner-Runner.app'
$stage = 'C:\tools\wda\ipa'
New-Item -ItemType Directory -Force "$stage\Payload" | Out-Null
Copy-Item $app "$stage\Payload\" -Recurse -Force
Compress-Archive -Path "$stage\Payload" -DestinationPath "$stage\WDA.zip" -Force
Move-Item "$stage\WDA.zip" "$stage\WebDriverAgent.ipa" -Force
```

**Sign and install with Sideloadly:**

1. Start Sideloadly (run as administrator the first time — its daemon writes a
   service and a registry `Run` entry).
2. Select the iPhone in the **iDevice** dropdown.
3. Drag `WebDriverAgent.ipa` into the **IPA** box.
4. Enter the full Apple ID (an email address or phone number, not a username).
5. Click **Start**, then enter the Apple ID password and the two-factor code.

Sideloadly appends your team id to the bundle id. When it finishes, find the
installed id:

```powershell
ios.exe apps | Select-String WebDriverAgent
# com.facebook.WebDriverAgentRunner.xctrunner.9AAY9CT487
```

That full value is what `runwda` needs. A free Apple ID signature lasts
**seven days**; after that, repeat this step.

> If Sideloadly fails before the password prompt, the usual causes are: it was
> not started as administrator (registry/service access), its Anisette cache is
> not writable, or a previous crash left `native-anis-iTunes.crashed` in its
> data folder. Restart it as administrator and retry.

## 4. Start the tunnel, the runner and the port forward

Three long-running processes. Keep each window open.

```powershell
# Terminal 1 — iOS 17+ developer tunnel (RSD)
ios.exe tunnel start --userspace
# look for: "userspace tunnel negotiated"
```

```powershell
# Terminal 2 — start WebDriverAgent through testmanagerd
ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest
# look for: "authorized":true, then the process stays attached
```

```powershell
# Terminal 3 — expose the device's 8100 on the host
ios.exe forward 8100 8100
```

Verify:

```powershell
curl.exe -s http://127.0.0.1:8100/status
```

You want `"ready": true`, `"state": "success"` and the iOS version.

**The phone must stay unlocked.** A locked screen makes `runwda` fail with
`Failed looking up pid of launched process`, and WDA session creation hangs
until the phone is awake. This is the single most common failure.

## 5. Start the Poki MCP server

```powershell
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
$env:POKI_MCP_STATE_DIR = "$env:USERPROFILE\Library\Application Support\PokiMCP"
node src\daemon.mjs --port 47825
```

The server prints a `ready` line with its URL and writes `mcp.json` into the
state directory:

```json
{
  "url": "http://127.0.0.1:47825/mcp",
  "port": 47825,
  "token": "<32 bytes>",
  "enabled": true,
  "pid": 12345
}
```

`%USERPROFILE%\Library\Application Support\PokiMCP` is the directory the
Aidi（懂AI帝）desktop app reads on Windows and macOS alike; use any other
absolute path if your client does not care.

## 6. Connect a client

**Any MCP client that speaks streamable HTTP:** use the `url` and send
`Authorization: Bearer <token>` on every request.

**Clients that launch server processes (Claude Code, Codex, …):** register the
stdio bridge instead, which reads `mcp.json`:

```powershell
claude mcp add --scope user poki-mcp -- node "$PWD\src\stdio.mjs"
codex mcp add poki-mcp -- node "$PWD\src\stdio.mjs"
```

## 7. Verify

```powershell
node bin\call.mjs list_devices
```

Expected: a single device with id `wda`, name `iPhone (WebDriverAgent)`, state
`Booted`. Then:

```powershell
node bin\call.mjs take_screenshot '{"path":"C:\\temp\\shot.png"}'
node bin\call.mjs list_elements
```

## Day-to-day restart

Save this as `scripts\start-poki.cmd` (edit the two bundle-id values):

```bat
@echo off
set "POKI_WDA_URL=http://127.0.0.1:8100"
set "POKI_MCP_STATE_DIR=%USERPROFILE%\Library\Application Support\PokiMCP"
start "go-ios tunnel" /min C:\tools\go-ios\ios.exe tunnel start --userspace
timeout /t 5 >nul
start "wda" /min C:\tools\go-ios\ios.exe runwda --bundleid=... --testrunnerbundleid=... --xctestconfig=WebDriverAgentRunner.xctest
timeout /t 10 >nul
start "forward" /min C:\tools\go-ios\ios.exe forward 8100 8100
cd /d "%~dp0.."
node src\daemon.mjs --port 47825
```

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ios list` empty | locked phone, bad cable, missing driver | unlock, try another cable/port, reinstall Apple drivers |
| `runwda`: `Failed looking up pid` | phone locked or a system prompt is showing | unlock, dismiss the prompt |
| WDA session hangs | same | act on the phone, then retry |
| HTTP 502 from `runwda` | tunnel info port conflict (go-ios falls back to 60105) | keep `tunnel start` on 28100, restart `runwda` after it |
| `curl :8100` times out | forward started before WDA was up | restart `ios forward 8100 8100` |
| WDA `not ready` | signature expired (7 days) | re-sign and reinstall |
| `web inspector is not enabled` | you tried `ios webinspector` | enable Settings → Safari → Advanced → Web Inspector, or ignore |
