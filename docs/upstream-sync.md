# Upstream documentation sync — 2026-11-08

This page records the documentation review for the Windows port. It is not a
claim that every upstream feature is implemented here.

| Item | Value |
| --- | --- |
| Upstream repository | <https://github.com/JosssphZhou/poki> |
| Upstream head reviewed | [`8b780c2`](https://github.com/JosssphZhou/poki/commit/8b780c2a0d2c5a4b2a9f1496e63b0a34156c3054) (2026-11-08) |
| Fork base | `7ee03e3` (2026-11-07) |
| Divergence | 102 upstream commits after the fork base, plus the four Windows commits |
| Scope of this review | Documentation only; no upstream code was merged into this port |

## What changed upstream

| Upstream document | Change | Status for this port |
| --- | --- | --- |
| All six `README*.md` files | Added contributors to the thanks wall; added a line pointing to the community Windows port `scy7796/poki-for-windows`. | This repository has its own README and is a separate Windows implementation. The upstream link is deliberately not copied as if it described this fork. |
| [`docs/tools.md`](https://github.com/JosssphZhou/poki/blob/main/docs/tools.md) | New `look` / `do` computer-use profile; `POKI_CUA_BACKEND=wda`; screenshot-text supplement when accessibility leaves a third of the screen unnamed; `touch_path` and `draw_strokes`; `run_code`; per-session input locks and a call log; new observation flags. | Not in this port. The WDA transport exists here, but the upstream `look` / `do` profile and the newer observation pipeline do not. |
| [`docs/configuration.md`](https://github.com/JosssphZhou/poki/blob/main/docs/configuration.md) | `POKI_INPUT_LOCK`, `POKI_INPUT_LOCK_WAIT_MS`, `POKI_MAX_CONCURRENT_READS`, `POKI_MCP_CALL_LOG`. | Not in this port. |
| [`docs/install.md`](https://github.com/JosssphZhou/poki/blob/main/docs/install.md) | Remote-access wording; new `usbmuxd` "no iPhone attached" and "no display service" troubleshooting rows. | The `usbmuxd` advice is still useful. The display-service section is about Apple's macOS developer image and does not apply to the WDA path. Windows installation remains in [install-windows.md](install-windows.md). |
| [`docs/physical-iphone.md`](https://github.com/JosssphZhou/poki/blob/main/docs/physical-iphone.md) | `prepare-device.mjs --image`; "Touch and text input fail" section for a developer image without `com.apple.coredevice.displayservice`; longer RemotePairing observation windows. | macOS-only. This port does not use `devicectl`, CoreDevice display services or the same image mount. |
| [`docs/remote-iphone.md`](https://github.com/JosssphZhou/poki/blob/main/docs/remote-iphone.md) | LAN Bonjour setup and DHCP recovery; clearer unreachable-pairing diagnostics; RSD health check before rebuilding a dead tunnel. | macOS-only RemotePairing, not used by this port. This port is USB + WDA. |
| [`docs/third-party-dependencies.md`](https://github.com/JosssphZhou/poki/blob/main/docs/third-party-dependencies.md) | Added `acorn` for `run_code` script normalization. | Not applicable: `run_code` is not in this port. |
| [`deploy/istoreos/README.md`](https://github.com/JosssphZhou/poki/blob/main/deploy/istoreos/README.md) | Router deployment notes. | Out of scope for the Windows host port. |
| [`docs/verification/lan-bonjour-recovery.md`](https://github.com/JosssphZhou/poki/blob/main/docs/verification/lan-bonjour-recovery.md) | New LAN address-change verification record. | macOS-only; recorded here so the next sync can find it. |

## What this fork supports

The authoritative list is in [WINDOWS.md](../WINDOWS.md). In short:

- One iPhone over USB through go-ios and WebDriverAgent.
- - Screenshots, accessibility tree, taps, text input, hardware buttons and
  -   `launch_app` by bundle id.
  -   - No simulator, OCR helper, screen recording, `list_apps`, modifier chords or
      -   multi-device inventory.
   
      -   ## Documentation changes made in this fork
   
      -   - Added this review page.
          - - Added an upstream-status note to `README.md` and `README.zh-CN.md`.
            - - Added a scope banner to the inherited macOS documentation so it is not read as
              -   a description of the Windows backend.
              -   - Kept the Windows-specific setup and limitations in
                  -   [install-windows.md](install-windows.md) and [WINDOWS.md](../WINDOWS.md).
               
                  -   ## Next sync
               
                  -   The next code sync should start from upstream `main`, preserve
                  -   `src/backends/wda.mjs`, and re-run the Windows verification after any change to
                  -   the shared observation or input layers. The most relevant upstream change to
                  -   evaluate first is `POKI_CUA_BACKEND=wda`, because it may reduce the amount of
                  -   Windows-only glue this fork has to carry.
