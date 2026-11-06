# 不用 Mac，让 Agent 操作真 iPhone：Poki for Windows 移植记

> 把设备层从 Xcode 工具链换成 go-ios + WebDriverAgent，240 行代码，MCP 层一行没改。
>
> 仓库：<https://github.com/wangweiwei8623-bit/poki-for-windows>
> 上游：<https://github.com/JosssphZhou/poki>（AGPL-3.0-only）

## 一、卡在哪儿

Poki 做的事很直接：在本地跑一个 MCP 服务，把 iPhone 的无障碍树、截图、点击、滑动、输入变成工具。Agent 接到手之后，就能像人一样用这台手机——点开 App、翻页、填表、发消息。

它在 macOS 上很顺，因为整条链路都是苹果自己的：Rust 桥接进程通过 RemoteXPC 直接和设备的服务对话，启动 App 用 `xcrun devicectl`，截图和无障碍各有一条原生通道，OCR 用 Vision 框架，模拟器用 `simctl`。

换到 Windows，问题不是 `npm install` 失败，而是设备层根本没有 Windows 实现：没有 Xcode、没有 `xcrun`、没有 Vision，也没有那套 Darwin 专有的进程间通道。上游的 `native/` 目录是一整个 Rust 工程，直接搬过来也跑不起来。

## 二、换个思路：只换设备层

真正有用的观察是：Poki 的桥接协议非常薄。

上层不关心设备怎么连，它只发这样的请求：

```json
{ "op": "tap", "x": 32768, "y": 40000 }
{ "op": "ax", "include_offscreen": false }
{ "op": "screenshot", "path": "C:\\temp\\shot.png" }
```

收到的是结构化的 JSON：元素数组、尺寸、缩放比。

而 WebDriverAgent 恰好把同一批原语暴露成了 HTTP：

| Poki 请求 | WDA 端点 |
| --- | --- |
| `screenshot` | `GET /screenshot` |
| `ax` | `GET /session/{id}/source?format=json` |
| `tap` | `POST /session/{id}/wda/tap/0` |
| `type_text` | `POST /session/{id}/wda/keys` |
| `launch_app` | `POST /session/{id}/wda/apps/launch` |
| `press_button` | `POST /session/{id}/wda/pressButton` |

所以移植不是重写 Poki，而是给它加**第三个设备后端**：`src/backends/wda.mjs`，240 行，由环境变量 `POKI_WDA_URL` 选中。MCP 服务、工具目录、协调层、提示词，全部保持上游原样。

## 三、整条管线

```text
MCP 客户端（Aidi、Claude Code、Codex……）
        │  streamable HTTP + Bearer Token，只监听 127.0.0.1
        ▼
Poki MCP 服务（Node.js 24，src/daemon.mjs）
        │  POKI_WDA_URL=http://127.0.0.1:8100
        ▼
WebDriverAgent（签进 iPhone 的 XCUITest runner）
        ▲
        │  XCTest / testmanagerd，走 iOS 17+ 开发者隧道
go-ios（28100 用户态隧道，`ios forward` 映射 8100）
        │  USB
        ▼
iPhone
```

三个关键件各管一段：

1. **Sideloadly** 用免费 Apple ID 给 WebDriverAgent 签名并安装——这一步只需要做一次（七天后再做一次）。
2. **go-ios** 建立 iOS 17+ 的开发者隧道（RSD），用 `testmanagerd` 把 WDA 拉起来，再把设备的 8100 端口转发到本机。
3. **Poki** 通过 `POKI_WDA_URL` 找到 WDA，把每个工具调用翻译成 HTTP 请求。

## 四、五步跑通

```powershell
git clone https://github.com/wangweiwei8623-bit/poki-for-windows.git
cd poki-for-windows
npm ci
```

```powershell
# 1. 开发者隧道（保持窗口不关）
ios.exe tunnel start --userspace

# 2. 通过 testmanagerd 启动 WDA（保持窗口不关）
ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest

# 3. 把 8100 转发出来
ios.exe forward 8100 8100

# 4. 确认 WDA 在线
curl.exe -s http://127.0.0.1:8100/status
```

```powershell
# 5. 启动 Poki
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
$env:POKI_MCP_STATE_DIR = "$env:USERPROFILE\Library\Application Support\PokiMCP"
node src\daemon.mjs --port 47825
```

服务会往 `mcp.json` 写地址和 32 字节 Token，MCP 客户端连上就能用。`list_devices` 返回唯一一台设备：`iPhone (WebDriverAgent)`，id 是 `wda`。

## 五、两个必须做对的细节

**1. 坐标系对不上，点了就偏。**

Poki 内部的触摸是归一化的 HID 报告（0..65535），WDA 要的是 point，而截图是像素。三个单位必须换算：先用 `/window/size` 拿到 point 尺寸，再从截图的 PNG 头里读出像素宽高，算出缩放比。

```js
const shot = Buffer.from((await call(base, '/screenshot')).value, 'base64');
const pixels = pngSize(shot);              // 读 PNG 头，不解码整张图
const value = pixels.width / active.width; // 1125 / 375 = 3
```

这个值只在第一次用，之后缓存；算不出来就直接报错，绝不猜——猜错就是点到别的地方。

**2. WDA 建会话会重置被测 App。**

每次 `POST /session` 都会把当前 App 重启一遍，所以不能每个工具调用都建会话。后端按 base URL 缓存一个会话，整个服务生命周期复用它。

## 六、踩过的坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| Sideloadly 一启动就报注册表 `Run` 权限 | 没以管理员运行 | 用管理员启动 |
| 下载 Anisette 数据失败 | 缓存目录不可写 | 建好缓存目录，清掉 `native-anis-iTunes.crashed` 标记 |
| 签名时 `key.pem` 写不进去 | `%APPDATA%\sideloadly` 权限 | 修正目录权限后重启 |
| 签名库写临时目录被拦 | 系统临时目录受限 | 给 Sideloadly 指定可写临时目录 |
| `runwda` 报 502 | 隧道信息端口冲突（go-ios 默认会去 60105） | 固定 28100，隧道起来后再启动 `runwda` |
| `Failed looking up pid of launched process` | 手机锁屏，或屏幕上有信任／验证弹窗 | 解锁、点掉提示再重试 |
| WDA 会话创建卡住 | 同上，WDA 在等 App 激活 | 同上 |

最烦的是最后两条：Windows 端看不到手机屏幕，只能靠 `lockdown get` 判断锁屏状态、靠进程列表推断前台是什么。建议第一次跑通时人就在手机边上。

## 七、真机验证

| 检查项 | 结果 |
| --- | --- |
| 开发者隧道 + 端口转发 | 通过 |
| `list_devices` | 通过，`iPhone (WebDriverAgent)` |
| `take_screenshot` | 通过，1125×2436 PNG |
| `list_elements` / WDA `source` | 通过 |
| 拉起 Safari 并打开指定 URL | 通过 |
| `tap` / `type_text` | 已实现，尚未在记录在案的运行中验证 |

iPhone 11 Pro / iOS 18.5，WebDriverAgent 16.15.2，Node 24.22.1，go-ios 1.3.2。

## 八、限制与下一步

- **单设备**：一个服务实例只驱动一台 WDA 设备。多设备要么多开实例，要么在 `inventory()` 里扩展。
- **能力缺口**：WDA 不提供已安装 App 列表和 iOS 设置读取，所以 `list_apps`、`configuration` 会明确报错，`launch_app` 必须传 bundle id。
- **七天签名**：免费 Apple ID 的 provisioning profile 只有 7 天。要长期跑，得用付费开发者账号，或者把重签做成计划任务。
- **无线**：WDA 本身可以走局域网，只是这版还没做配对和发现，目前依赖 USB 转发。

下一步我想把 `tap` / `type_text` 的端到端用例补上，再试试把转发换成 go-ios 的远程模式，去掉数据线。

## 九、许可证

上游是 AGPL-3.0-only，这个分支保持同一许可证，改动清单写在 `NOTICE.md` 里。仓库不含任何 Apple 的开发者镜像、描述文件或已签名的 IPA，Sideloadly 和 go-ios 都是外部工具。

如果你也在 Windows 上折腾 iPhone 自动化，欢迎直接拿这个仓库开跑，问题提到 issue 里。
