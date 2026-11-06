<p align="center">
  <img src="docs/images/poki-icon.png" width="72" height="72" alt="Poki icon">
</p>

<h1 align="center">Poki for Windows</h1>

<p align="center">
  <a href="README.md">English</a> | 绠€浣撲腑鏂?</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--only-blue" alt="License: AGPL-3.0-only"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20iOS-lightgrey" alt="Platform: Windows and iOS">
</p>

**鍦?Windows 涓婏紝璁╀换鎰?MCP Agent 鐩存帴鎿嶄綔涓€鍙扮湡 iPhone鈥斺€斾笉闇€瑕?Mac銆佷笉闇€瑕?Xcode銆佷笉瓒婄嫳銆佷笉鍔犵‖浠躲€?*

Poki 閫氳繃鏈湴鏈嶅姟鎶?iPhone 鐨勬棤闅滅鏍戙€佺偣鍑汇€佹粦鍔ㄣ€佽緭鍏ユ毚闇叉垚 MCP 宸ュ叿锛?Agent 灏辫兘鍍忎汉涓€鏍风敤杩欏彴鎵嬫満銆?
> 鏈粨搴撴槸 [JosssphZhou/poki](https://github.com/JosssphZhou/poki) 鐨?*闈炲畼鏂?Windows 绉绘**銆?> 涓婃父闈㈠悜 macOS锛岃澶囧眰渚濊禆 Rust 妗ュ拰 Xcode 宸ュ叿閾撅紱Windows 涓婃病鏈?Xcode锛?> 鎵€浠ヨ繖閲屾妸璁惧灞傛崲鎴愪簡 **go-ios + WebDriverAgent锛圚TTP锛?*锛?> MCP 鏈嶅姟銆佸伐鍏峰畾涔夊拰鎻愮ず璇嶉兘淇濇寔涓婃父鍘熸牱銆傜Щ妞嶇粏鑺傝 [WINDOWS.md](WINDOWS.md)銆?
## 鍘熺悊

```text
MCP 瀹㈡埛绔紙Aidi銆丆laude Code銆丆odex鈥︹€︼級
        鈹? streamable HTTP + Bearer Token锛屼粎鐩戝惉 127.0.0.1
        鈻?Poki MCP 鏈嶅姟锛圢ode.js 24锛宻rc/daemon.mjs锛?        鈹? POKI_WDA_URL=http://127.0.0.1:8100
        鈻?WebDriverAgent锛堢杩?iPhone 鐨?XCUITest runner锛?        鈻?        鈹? XCTest / testmanagerd锛岃蛋 iOS 17+ 寮€鍙戣€呴毀閬?go-ios锛?8100 鐨勭敤鎴锋€侀毀閬擄紝鐢?`ios forward` 鏄犲皠 8100锛?        鈹? USB
        鈻?iPhone
```

鐢ㄤ笁鏍蜂笢瑗挎浛浠?Mac锛?
1. **go-ios** 寤虹珛 iOS 17+ 寮€鍙戣€呴毀閬擄紝骞堕€氳繃 `testmanagerd` 鎷夎捣
   WebDriverAgent鈥斺€斿拰 Xcode 璧扮殑鏄悓涓€鏉¤矾锛屽彧鏄笉闇€瑕?Xcode銆?2. **WebDriverAgent** 鐢ㄥ厤璐?Apple ID 绛惧悕銆佽涓€娆★紱鍦?Windows 涓婄敤 Sideloadly
   瀹屾垚绛惧悕锛屼箣鍚庡氨鏄函 HTTP 璋冪敤銆?3. **Poki** 澧炲姞绗笁涓澶囧悗绔?[src/backends/wda.mjs](src/backends/wda.mjs)锛?   鐢?`POKI_WDA_URL` 閫夋嫨銆傛墍鏈夊伐鍏风殑鍏ュ弬鍑哄弬淇濇寔涓婃父缁撴瀯锛屽悗绔互涓婃棤闇€鏀瑰姩銆?
## 鐜瑕佹眰

- Windows 10/11 x64
- Node.js 24+
- Apple 绉诲姩璁惧椹卞姩锛坕Tunes 鎴?Apple Devices锛汼ideloadly 鑷甫鐨?usbmuxd
  涔熻兘琚?go-ios 浣跨敤锛?- [go-ios](https://github.com/danielpaulus/go-ios) 1.3.x锛坄ios.exe`锛?- [Sideloadly](https://sideloadly.io/) + 浠绘剰鍏嶈垂 Apple ID锛岀敤鏉ョ WebDriverAgent
- iPhone 绯荤粺 iOS 17+锛屽凡寮€鍚紑鍙戣€呮ā寮忥紝USB 杩炴帴

## 蹇€熷紑濮?
```powershell
git clone https://github.com/wangweiwei8623-bit/poki-for-windows.git
cd poki-for-windows
npm ci

# 1. 鐢?Sideloadly 绛惧悕骞跺畨瑁?WebDriverAgent锛堝彧闇€涓€娆★紝瑙?docs/install-windows.md锛?# 2. 寤虹珛寮€鍙戣€呴毀閬?.\goios\ios.exe tunnel start --userspace

# 3. 鍚姩 WebDriverAgent锛堜繚鎸佺獥鍙ｄ笉鍏筹級
.\goios\ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest

# 4. 鎶?WDA 鏆撮湶鍒版湰鏈?8100
.\goios\ios.exe forward 8100 8100

# 5. 鍚姩 MCP 鏈嶅姟
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
$env:POKI_MCP_STATE_DIR = "$env:USERPROFILE\Library\Application Support\PokiMCP"
node src\daemon.mjs --port 47825
```

鏈嶅姟浼氭妸鍦板潃鍜?Bearer Token 鍐欏埌
`%USERPROFILE%\Library\Application Support\PokiMCP\mcp.json`
锛堝彲鐢?`POKI_MCP_STATE_DIR` 鏀硅矾寰勶級銆侻CP 瀹㈡埛绔洿鎺ヨ繛杩欎釜 URL锛?鎴栬€呯敤 stdio 妗ユ帴锛歚node src\stdio.mjs`銆?
楠岃瘉锛?
```powershell
node bin/call.mjs list_devices
```

浼氳繑鍥炲敮涓€涓€鍙拌澶?**`iPhone (WebDriverAgent)`**锛岃澶?id 鏄?`wda`銆?
## WDA 鍚庣鏀寔鍝簺鎿嶄綔

| 鎿嶄綔 | 鐘舵€?|
| --- | --- |
| `list_devices`銆乣get_device_info` | 鍙敤锛堝崟鍙拌櫄鎷熻澶?`wda`锛?|
| `take_screenshot`銆佸睆骞曠缉鏀?| 鍙敤锛岀缉鏀剧敱 WDA 鎴浘灏哄鎺ㄧ畻 |
| `list_elements`锛堟棤闅滅鏍戯級 | 鍙敤 |
| `tap`銆乣double_tap`銆乣long_press`銆乣swipe`/`drag`銆乣pinch` | 宸插疄鐜?|
| `type_text`銆乣press_key`锛圧eturn / Backspace锛?| 宸插疄鐜?|
| `press_button`锛圚ome銆侀煶閲忛敭锛?| 宸插疄鐜?|
| `launch_app`锛堟寜 bundle id锛?| 宸插疄鐜?|
| `list_apps`銆乣configuration`銆佺粍鍚堥敭 | WDA 涓嶆彁渚?|
| 妯℃嫙鍣ㄣ€佸綍灞忋€丱CR | 鏈Щ妞嶄笉鏀寔 |

## 鐪熸満楠岃瘉

涓绘満锛歐indows 11 x64锛孨ode.js 24.22.1锛実o-ios 1.3.2銆?璁惧锛歩Phone 11 Pro锛宨OS 18.5锛學ebDriverAgent 16.15.2銆?
| 妫€鏌ラ」 | 缁撴灉 |
| --- | --- |
| 寮€鍙戣€呴毀閬?+ `ios forward 8100` | 閫氳繃 |
| `list_devices` 鈫?`iPhone (WebDriverAgent)` | 閫氳繃 |
| `take_screenshot` | 閫氳繃锛?125脳2436 PNG锛?|
| `list_elements` / WDA `source` | 閫氳繃 |
| 鎷夎捣 Safari 骞舵墦寮€鎸囧畾 URL | 閫氳繃 |
| `tap` / `type_text` | 宸插疄鐜帮紝灏氭湭鍦ㄨ褰曞湪妗堢殑杩愯涓獙璇?|

## 宸茬煡闄愬埗

- **涓冨ぉ绛惧悕銆?* 鍏嶈垂 Apple ID 绛剧殑 WebDriverAgent 鍙湁 7 澶╂湁鏁堟湡锛岃繃鏈熻閲嶆柊
  绛惧悕瀹夎銆?- **鎵嬫満蹇呴』瑙ｉ攣銆?* 閿佸睆鐘舵€佷笅鎷夎捣 App 鍜屽缓绔嬩細璇濋兘浼氬け璐ワ紱鏈Щ妞嶆棤娉曡В閿佽浜?  瀵嗙爜鐨勬墜鏈恒€?- **鍗曡澶囥€?* 涓€涓湇鍔″疄渚嬪彧鏆撮湶涓€鍙?WDA 璁惧銆?- **娌℃湁妯℃嫙鍣ㄥ拰 OCR銆?* 杩欎簺鏄?macOS 涓撴湁鑳藉姏锛屾澶勮烦杩囷紝瑙傚療渚濊禆鏃犻殰纰嶆爲鍜屾埅鍥俱€?- **鏈嶅姟鍙洃鍚湰鏈恒€?* 鏈Щ妞嶆妸涓婃父鐨?`POKI_BIND_HOST`/`POKI_HOST_ALLOW`
  澶氬湴鍧€缁戝畾绠€鍖栨垚浜嗗崟涓€ `127.0.0.1`銆?
## 鏂囨。

| 涓婚 | 闃呰 |
| --- | --- |
| 绉绘璇存槑銆佷唬鐮佹敼鍔ㄣ€佷笌涓婃父宸紓 | [WINDOWS.md](WINDOWS.md) |
| 瀹屾暣 Windows 瀹夎姝ラ | [docs/install-windows.md](docs/install-windows.md) |
| 涓婃父鐨勬蹇典笌宸ュ叿鍙傝€?| [docs/tools.md](docs/tools.md)銆乕docs/physical-iphone.md](docs/physical-iphone.md) |

## 瀹夊叏

Poki 鎿嶄綔鐨勬槸鐪熸墜鏈猴細瀹冭兘鐐瑰嚮銆佽緭鍏ャ€佸彂娑堟伅銆佹墦寮€ App锛屽睆骞曞唴瀹逛細鍙戦€佺粰浣犻厤缃殑
妯″瀷鏈嶅姟銆侻CP 绔偣鍙洃鍚?`127.0.0.1`锛屽苟瑕佹眰 `mcp.json` 閲岄偅涓?32 瀛楄妭 Bearer
Token锛涜繖涓?Token 绛夊悓浜庡瘑鐮侊紝璇峰Ε鍠勪繚绠°€?
## 璁稿彲璇佷笌鏉ユ簮

AGPL-3.0-only锛岀户鎵胯嚜涓婃父銆傝繖鏄慨鏀硅繃鐨勫垎鏀紝鏀瑰姩娓呭崟瑙?[NOTICE.md](NOTICE.md)锛岀涓夋柟渚濊禆瑙?[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)銆?
涓婃父锛?https://github.com/JosssphZhou/poki> 路 <https://poki.bot>

