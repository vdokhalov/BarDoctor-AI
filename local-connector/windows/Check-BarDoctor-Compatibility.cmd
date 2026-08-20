@echo off
setlocal
title BarDoctor Local Connector Compatibility Check
set "BD_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "BD_POWERSHELL=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%BD_POWERSHELL%" set "BD_POWERSHELL=powershell.exe"
"%BD_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-compatibility.ps1"
set "BD_RESULT=%ERRORLEVEL%"
echo.
if not "%BD_RESULT%"=="0" echo Compatibility check failed. Open compatibility-report.txt for details.
if "%BD_RESULT%"=="0" echo Compatibility check completed successfully. Review warnings before installation.
pause
exit /b %BD_RESULT%
