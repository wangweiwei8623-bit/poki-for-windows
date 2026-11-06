@echo off
rem iOS 17+ developer tunnel. Keep this window open.
rem The info API listens on 28100; ios.exe runwda reads it from there.
set "GOIOS=C:\tools\go-ios\ios.exe"
"%GOIOS%" tunnel start --userspace
