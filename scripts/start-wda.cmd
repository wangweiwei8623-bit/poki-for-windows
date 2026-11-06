@echo off
rem Start WebDriverAgent through testmanagerd, then expose port 8100.
rem Run start-tunnel.cmd first and keep it running.
rem
rem BUNDLE_ID is the signed runner id. Find it with:  ios.exe apps ^| findstr WebDriverAgent
rem Sideloadly appends the team id, e.g.
rem com.facebook.WebDriverAgentRunner.xctrunner.9AAY9CT487
set "GOIOS=C:\tools\go-ios\ios.exe"
set "BUNDLE_ID=com.facebook.WebDriverAgentRunner.xctrunner.REPLACE_ME"

start "wda" /min "%GOIOS%" runwda --bundleid=%BUNDLE_ID% --testrunnerbundleid=%BUNDLE_ID% --xctestconfig=WebDriverAgentRunner.xctest
timeout /t 10 /nobreak >nul
start "wda-forward" /min "%GOIOS%" forward 8100 8100

echo WDA should answer at http://127.0.0.1:8100/status in a few seconds.
