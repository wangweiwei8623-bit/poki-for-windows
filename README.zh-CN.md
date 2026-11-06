<p align="center">
  <img src="docs/images/poki-icon.png" width="72" height="72" alt="Poki icon">
</p>

<h1 align="center">Poki for Windows</h1>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--only-blue" alt="License: AGPL-3.0-only"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20iOS-lightgrey" alt="Platform: Windows and iOS">
</p>

**在 Windows 上，让任意 MCP Agent 直接操作一台真 iPhone——不需要 Mac、不需要 Xcode、不越狱、不加硬件。**

Poki 通过本地服务把 iPhone 的无障碍树、点击、滑动、输入暴露成 MCP 工具，
Agent 就能像人一样用这台手机。

> 本仓库是 [JosssphZhou/poki](https://github.com/JosssphZhou/poki) 的**非官方 Windows 移植**。
> 上游面向 macOS，设备层依赖 Rust 桥和 Xcode 工具链；Windows 上没有 Xcode，
> 所以这里把设备层换成了 **go-ios + WebDriverAgent（HTTP）**，
> MCP 服务、工具定义和提示词都保持上游原样。移植细节见 [WINDOWS.md](WINDOWS.md)。
>
> 本仓库是独立分支：**Windows 移植不合入上游**，问题与 PR 请提到本仓库。

## 原理

```text
MCP 客户端（Aidi、Claude Code、Codex……）
        │  streamable HTTP + Bearer Token，仅监听 127.0.0.1
        ▼
Poki MCP 服务（Node.js 24，src/daemon.mjs）
        │  POKI_WDA_URL=http://127.0.0.1:8100
        ▼
WebDriverAgent（签进 iPhone 的 XCUITest runner）
        ▲
        │  XCTest / testmanagerd，走 iOS 17+ 开发者隧道
go-ios（28100 的用户态隧道，用 `ios forward` 映射 8100）
        │  USB
        ▼
iPhone
```

用三样东西替代 Mac：

1. **go-ios** 建立 iOS 17+ 开发者隧道，并通过 `testmanagerd` 拉起
   WebDriverAgent——和 Xcode 走的是同一条路，只是不需要 Xcode。
2. **WebDriverAgent** 用免费 Apple ID 签名、装一次；在 Windows 上用 Sideloadly
   完成签名，之后就是纯 HTTP 调用。
3. **Poki** 增加第三个设备后端 [src/backends/wda.mjs](src/backends/wda.mjs)，
   由 `POKI_WDA_URL` 选择。所有工具的入参出参保持上游结构，后端以上无需改动。

## 环境要求

- Windows 10/11 x64
- Node.js 24+
- Apple 移动设备驱动（iTunes 或 Apple Devices；Sideloadly 自带的 usbmuxd
  也能被 go-ios 使用）
- [go-ios](https://github.com/danielpaulus/go-ios) 1.3.x（`ios.exe`）
- [Sideloadly](https://sideloadly.io/) + 任意免费 Apple ID，用来签 WebDriverAgent
- iPhone 系统 iOS 17+，已开启开发者模式，USB 连接

## 快速开始

```powershell
git clone https://github.com/wangweiwei8623-bit/poki-for-windows.git
cd poki-for-windows
npm ci

# 1. 用 Sideloadly 签名并安装 WebDriverAgent（只需一次，见 docs/install-windows.md）
# 2. 建立开发者隧道
.\goios\ios.exe tunnel start --userspace

# 3. 启动 WebDriverAgent（保持窗口不关）
.\goios\ios.exe runwda `
  --bundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --testrunnerbundleid=com.facebook.WebDriverAgentRunner.xctrunner.<TEAM_ID> `
  --xctestconfig=WebDriverAgentRunner.xctest

# 4. 把 WDA 暴露到本机 8100
.\goios\ios.exe forward 8100 8100

# 5. 启动 MCP 服务
$env:POKI_WDA_URL = 'http://127.0.0.1:8100'
$env:POKI_MCP_STATE_DIR = "$env:USERPROFILE\Library\Application Support\PokiMCP"
node src\daemon.mjs --port 47825
```

服务会把地址和 Bearer Token 写到
`%USERPROFILE%\Library\Application Support\PokiMCP\mcp.json`
（可用 `POKI_MCP_STATE_DIR` 改路径）。MCP 客户端直接连这个 URL，
或者用 stdio 桥接：`node src\stdio.mjs`。

验证：

```powershell
node bin/call.mjs list_devices
```

会返回唯一一台设备 **`iPhone (WebDriverAgent)`**，设备 id 是 `wda`。

## WDA 后端支持哪些操作

| 操作 | 状态 |
| --- | --- |
| `list_devices`、`get_device_info` | 可用（单台虚拟设备 `wda`） |
| `take_screenshot`、屏幕缩放 | 可用，缩放由 WDA 截图尺寸推算 |
| `list_elements`（无障碍树） | 可用 |
| `tap`、`double_tap`、`long_press`、`swipe`/`drag`、`pinch` | 已实现 |
| `type_text`、`press_key`（Return / Backspace） | 已实现 |
| `press_button`（Home、音量键） | 已实现 |
| `launch_app`（按 bundle id） | 已实现 |
| `list_apps`、`configuration`、组合键 | WDA 不提供 |
| 模拟器、录屏、OCR | 本移植不支持 |

## 真机验证

主机：Windows 11 x64，Node.js 24.22.1，go-ios 1.3.2。
设备：iPhone 11 Pro，iOS 18.5，WebDriverAgent 16.15.2。

| 检查项 | 结果 |
| --- | --- |
| 开发者隧道 + `ios forward 8100` | 通过 |
| `list_devices` → `iPhone (WebDriverAgent)` | 通过 |
| `take_screenshot` | 通过（1125×2436 PNG） |
| `list_elements` / WDA `source` | 通过 |
| 拉起 Safari 并打开指定 URL | 通过 |
| `tap` / `type_text` | 已实现，尚未在记录在案的运行中验证 |

## 已知限制

- **七天签名。** 免费 Apple ID 签的 WebDriverAgent 只有 7 天有效期，过期要重新
  签名安装。
- **手机必须解锁。** 锁屏状态下拉起 App 和建立会话都会失败；本移植无法解锁设了
  密码的手机。
- **单设备。** 一个服务实例只暴露一台 WDA 设备。
- **没有模拟器和 OCR。** 这些是 macOS 专有能力，此处跳过，观察依赖无障碍树和截图。
- **服务只监听本机。** 本移植把上游的 `POKI_BIND_HOST`/`POKI_HOST_ALLOW`
  多地址绑定简化成了单一 `127.0.0.1`。

## 文档

| 主题 | 阅读 |
| --- | --- |
| 移植说明、代码改动、与上游差异 | [WINDOWS.md](WINDOWS.md) |
| 完整 Windows 安装步骤 | [docs/install-windows.md](docs/install-windows.md) |
| 上游的概念与工具参考 | [docs/tools.md](docs/tools.md)、[docs/physical-iphone.md](docs/physical-iphone.md) |

## 安全

Poki 操作的是真手机：它能点击、输入、发消息、打开 App，屏幕内容会发送给你配置的
模型服务。MCP 端点只监听 `127.0.0.1`，并要求 `mcp.json` 里那个 32 字节 Bearer
Token；这个 Token 等同于密码，请妥善保管。

## 许可证与来源

AGPL-3.0-only，继承自上游。这是修改过的分支，改动清单见
[NOTICE.md](NOTICE.md)，第三方依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

上游：<https://github.com/JosssphZhou/poki> · <https://poki.bot>
