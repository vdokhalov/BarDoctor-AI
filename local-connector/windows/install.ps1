$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = Join-Path $env:LOCALAPPDATA "Programs\BarDoctor Local Connector"
$logPath = Join-Path $packageRoot "setup.log"

function Write-SetupLog([string]$Message) {
  $line = "{0:u} {1}" -f (Get-Date), $Message
  $line | Out-File -FilePath $logPath -Append -Encoding UTF8
  Write-Host $Message
}

try {
  Write-SetupLog "Starting BarDoctor Local Connector installation."
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw "This installer can only run on Windows."
  }
  $compatibilityScript = Join-Path $packageRoot "check-compatibility.ps1"
  if (-not (Test-Path -LiteralPath $compatibilityScript)) {
    throw "The compatibility checker is missing. Download and extract the package again."
  }
  $systemPowerShell = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (-not (Test-Path -LiteralPath $systemPowerShell)) { $systemPowerShell = "powershell.exe" }
  $compatibilityOutput = & $systemPowerShell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $compatibilityScript -InstallerMode 2>&1
  $compatibilityOutput | Out-File -FilePath $logPath -Append -Encoding UTF8
  if ($LASTEXITCODE -ne 0) {
    throw "Compatibility check failed. Open compatibility-report.txt next to the installer. No files were installed."
  }
  $framework = Get-ItemProperty -LiteralPath "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" -ErrorAction SilentlyContinue
  $release = if ($framework -ne $null) { $framework.Release } else { 0 }
  if (-not $release -or $release -lt 528040) {
    throw "Microsoft .NET Framework 4.8 is required. Install Windows updates and try again."
  }
  $compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
  if (-not (Test-Path $compiler)) {
    throw "The Windows C# compiler was not found. Repair .NET Framework 4.8 and try again."
  }
  $sourceRoot = Join-Path $packageRoot "src"
  $sources = Get-ChildItem -Path $sourceRoot -Filter "*.cs" | Sort-Object Name | ForEach-Object { $_.FullName }
  if (-not $sources -or $sources.Count -lt 4) {
    throw "The installation package is incomplete. Download it again from BarDoctor."
  }
  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
  $output = Join-Path $installRoot "BarDoctor.LocalConnector.exe"
  $references = @(
    "System.dll",
    "System.Core.dll",
    "System.Drawing.dll",
    "System.Security.dll",
    "System.Web.Extensions.dll",
    "System.Windows.Forms.dll",
    "Microsoft.CSharp.dll"
  ) | ForEach-Object { "/reference:$_" }
  $arguments = @(
    "/nologo",
    "/target:winexe",
    "/platform:x86",
    "/optimize+",
    "/warn:4",
    "/out:$output"
  ) + $references + $sources
  $compilerOutput = & $compiler $arguments 2>&1
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $output)) {
    $compilerOutput | Out-File -FilePath $logPath -Append -Encoding UTF8
    throw "Windows could not build the connector. The technical details are in setup.log."
  }
  Copy-Item (Join-Path $packageRoot "uninstall.ps1") (Join-Path $installRoot "uninstall.ps1") -Force
  Copy-Item (Join-Path $packageRoot "Uninstall-BarDoctor-Local-Connector.cmd") (Join-Path $installRoot "Uninstall-BarDoctor-Local-Connector.cmd") -Force
  Copy-Item (Join-Path $packageRoot "check-compatibility.ps1") (Join-Path $installRoot "check-compatibility.ps1") -Force
  Copy-Item (Join-Path $packageRoot "Check-BarDoctor-Compatibility.cmd") (Join-Path $installRoot "Check-BarDoctor-Compatibility.cmd") -Force
  Copy-Item (Join-Path $packageRoot "BarDoctor.LocalConnector.exe.config") ($output + ".config") -Force
  $compatibilityReport = Join-Path $packageRoot "compatibility-report.txt"
  if (Test-Path -LiteralPath $compatibilityReport) { Copy-Item $compatibilityReport (Join-Path $installRoot "compatibility-report.txt") -Force }
  Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "BarDoctorLocalConnector" -Value ('"{0}" --background' -f $output)

  $shell = New-Object -ComObject WScript.Shell
  $desktopShortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Desktop")) "BarDoctor Local Connector.lnk"))
  $desktopShortcut.TargetPath = $output
  $desktopShortcut.WorkingDirectory = $installRoot
  $desktopShortcut.Description = "Read-only connector between local 1C and BarDoctor"
  $desktopShortcut.Save()
  $startMenu = Join-Path ([Environment]::GetFolderPath("Programs")) "BarDoctor"
  New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
  Copy-Item (Join-Path ([Environment]::GetFolderPath("Desktop")) "BarDoctor Local Connector.lnk") (Join-Path $startMenu "BarDoctor Local Connector.lnk") -Force

  Write-SetupLog "Installation completed."
  Start-Process -FilePath $output
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("BarDoctor Local Connector установлен. Вставьте ключ подключения и следуйте мастеру.", "BarDoctor", "OK", "Information") | Out-Null
  exit 0
} catch {
  Write-SetupLog ("ERROR: " + $_.Exception.Message)
  Add-Type -AssemblyName PresentationFramework -ErrorAction SilentlyContinue
  if ("System.Windows.MessageBox" -as [type]) {
    [System.Windows.MessageBox]::Show($_.Exception.Message, "BarDoctor — установка не завершена", "OK", "Error") | Out-Null
  }
  exit 1
}
