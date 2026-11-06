# NOTICE — modified fork

This repository is an unofficial **Windows port** of Poki.

- Upstream: <https://github.com/JosssphZhou/poki> (AGPL-3.0-only),
  version 0.1.1, fetched 2026-11-06.
- This fork: <https://github.com/wangweiwei8623-bit/poki-for-windows>
- License: AGPL-3.0-only (unchanged). See [LICENSE](LICENSE).

Under AGPL-3.0, modifications must be marked and the complete corresponding
source made available. This file records the changes.

## Changes from upstream

1. **`src/backends/wda.mjs` (new).** A WebDriverAgent backend implementing the
   native-bridge request contract over HTTP: session cache, screenshot-derived
   scale, accessibility tree flattening, taps in points, long press, drag,
   pinch, text input, keys, hardware buttons, app launch, screenshots.
2. **`src/device.mjs`.** Selects the WDA backend when `POKI_WDA_URL` is set:
   synthetic one-device inventory, `target()`, `bridge()`, `scale()`,
   `capture()`. Renames the remote-device helper call path to
   `remoteRequest()`.
3. **`src/daemon.mjs`.** Single loopback listener; removes `POKI_BIND_HOST`,
   `POKI_HOST_ALLOW` and the multi-server bind logic; token is always
   generated locally; local-helper cleanup removed.
4. **`src/platform.mjs`, `src/remote.mjs`, `src/batch.mjs`,
   `src/interaction.mjs`, `src/recording.mjs`.** Follow the renamed helper;
   the app-termination match is inlined.
5. **`src/data/tools.json`.** Tool descriptions for the synthetic `wda` device.
6. **`package.json`.** Description changed to mention Windows.
7. **Docs and scripts.** `README.md`, `README.zh-CN.md`, `WINDOWS.md`,
   `docs/install-windows.md`, `scripts/*.cmd` are new or rewritten for Windows.

Nothing above the device layer — tool catalog, coordination, prompts, MCP
protocol — was redesigned.

## Not bundled

- No Apple Developer Disk Image, provisioning profile, or signed IPA is
  distributed here.
- Sideloadly is referenced as an external tool; it is not included.
- go-ios is an external MIT-licensed binary; see
  <https://github.com/danielpaulus/go-ios>.

## Third-party components

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the dependencies
inherited from upstream.
