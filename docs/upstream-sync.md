# Upstream documentation sync — 2026-11-08

Upstream reviewed: `8b780c2` (2026-11-08). Fork base: `7ee03e3` (2026-11-07). Divergence: 102 upstream commits plus the four Windows commits. Documentation only; no upstream code was merged.

## What changed upstream

The main documentation additions are `run_code`, `look` / `do`, `POKI_CUA_BACKEND=wda`, the screenshot-text supplement, `touch_path` and `draw_strokes`, multi-client input locking, and LAN Bonjour recovery for RemotePairing. The upstream READMEs also added a contributor wall and a link to a different community Windows port (`scy7796/poki-for-windows`), which is not this repository.

The macOS-only setup pages gained developer-disk-image and display-service troubleshooting. Those do not apply to the WDA path in this port. The Windows setup remains in `install-windows.md`.

## Status in this fork

This fork supports one iPhone over USB through go-ios and WebDriverAgent, with screenshots, the accessibility tree, taps, text input, hardware buttons and `launch_app` by bundle id. It does not have the simulator, OCR helper, screen recording, `list_apps`, modifier chords, multi-device inventory, `run_code`, `look` / `do`, or LAN RemotePairing.

## Next sync

Start from upstream `main`, preserve `src/backends/wda.mjs`, and re-run the Windows verification after changes to the shared observation or input layers. Evaluate `POKI_CUA_BACKEND=wda` first: it may reduce the Windows-only glue.
