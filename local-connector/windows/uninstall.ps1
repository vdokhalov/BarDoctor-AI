$ErrorActionPreference = "Stop"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs\BarDoctor Local Connector"
$exe = Join-Path $installRoot "BarDoctor.LocalConnector.exe"
Get-Process -Name "BarDoctor.LocalConnector" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "BarDoctorLocalConnector" -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath("Desktop")) "BarDoctor Local Connector.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath("Programs")) "BarDoctor\BarDoctor Local Connector.lnk") -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300
if (Test-Path $exe) { Remove-Item $exe -Force }
Write-Host "BarDoctor Local Connector removed. Local settings and queued data were kept in LocalAppData."
