@echo off
setlocal
title BarDoctor Local Connector Setup
set "BD_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "BD_POWERSHELL=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%BD_POWERSHELL%" set "BD_POWERSHELL=powershell.exe"
"%BD_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo Installation failed. Read the message above or send setup.log to BarDoctor support.
  pause
  exit /b 1
)
exit /b 0
