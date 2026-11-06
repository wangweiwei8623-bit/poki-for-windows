@echo off
rem Start the Poki MCP server against the local WebDriverAgent endpoint.
rem Run start-tunnel.cmd and start-wda.cmd first.
setlocal
set "POKI_WDA_URL=http://127.0.0.1:8100"
set "POKI_MCP_STATE_DIR=%USERPROFILE%\Library\Application Support\PokiMCP"
cd /d "%~dp0.."
node src\daemon.mjs --port 47825
