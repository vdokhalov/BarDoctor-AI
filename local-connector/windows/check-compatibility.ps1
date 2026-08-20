param(
  [string]$ServerUrl = "https://bardoctor-preview.v-dokhalov.chatgpt.site",
  [switch]$InstallerMode
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportPath = Join-Path $packageRoot "compatibility-report.txt"
$script:failures = 0
$script:warnings = 0
$script:results = New-Object System.Collections.Generic.List[string]

function Add-Result([string]$State, [string]$Name, [string]$Detail) {
  $line = "[{0}] {1}: {2}" -f $State, $Name, $Detail
  $script:results.Add($line)
  if ($State -eq "FAIL") { $script:failures++ }
  if ($State -eq "WARN") { $script:warnings++ }
  $color = if ($State -eq "PASS") { "Green" } elseif ($State -eq "WARN") { "Yellow" } else { "Red" }
  Write-Host $line -ForegroundColor $color
}

function Read-RegistryValue([string]$Path, [string]$Name) {
  try {
    $item = Get-ItemProperty -LiteralPath $Path -ErrorAction Stop
    return $item.$Name
  } catch { return $null }
}

function Get-NetFrameworkRelease {
  $views = @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)
  foreach ($view in $views) {
    $base = $null
    $key = $null
    try {
      $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, $view)
      $key = $base.OpenSubKey("SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full")
      if ($key -ne $null) {
        $value = $key.GetValue("Release")
        if ($value -ne $null) { return [int]$value }
      }
    } catch {
      # The other registry view is checked next.
    } finally {
      if ($key -ne $null) { $key.Dispose() }
      if ($base -ne $null) { $base.Dispose() }
    }
  }
  return 0
}

Write-Host "BarDoctor Local Connector — проверка совместимости" -ForegroundColor Cyan
Write-Host "Проверка не открывает базу 1С и не читает её файлы."

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  Add-Result "FAIL" "Windows" "Поддерживается только Windows."
} else {
  $currentVersionKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion"
  $productName = [string](Read-RegistryValue $currentVersionKey "ProductName")
  $majorValue = Read-RegistryValue $currentVersionKey "CurrentMajorVersionNumber"
  $minorValue = Read-RegistryValue $currentVersionKey "CurrentMinorVersionNumber"
  $legacyVersion = [string](Read-RegistryValue $currentVersionKey "CurrentVersion")
  $build = [string](Read-RegistryValue $currentVersionKey "CurrentBuildNumber")
  $osVersion = $null
  try {
    if ($majorValue -ne $null) { $osVersion = New-Object System.Version -ArgumentList ([int]$majorValue), ([int]$minorValue) }
    elseif ($legacyVersion) { $osVersion = New-Object System.Version -ArgumentList $legacyVersion }
  } catch { $osVersion = [Environment]::OSVersion.Version }
  if ($osVersion -eq $null) { $osVersion = [Environment]::OSVersion.Version }
  $isServer = $productName -match "Server"
  $isServer2012R2 = $productName -match "Windows Server 2012 R2" -or ($isServer -and $osVersion.Major -eq 6 -and $osVersion.Minor -eq 3)
  $minimumServerVersion = New-Object System.Version -ArgumentList 6, 3
  $supported = ($isServer -and $osVersion -ge $minimumServerVersion) -or ((-not $isServer) -and $osVersion.Major -ge 10)
  if ($supported) {
    Add-Result "PASS" "Windows" ((@($productName, ("build " + $build)) | Where-Object { $_ }) -join " · ")
  } else {
    Add-Result "FAIL" "Windows" "Нужны Windows 10/11 либо Windows Server 2012 R2 или новее."
  }
  if ($isServer2012R2) {
    $esuEnd = [DateTime]::Parse("2026-10-13T23:59:59Z").ToUniversalTime()
    if ([DateTime]::UtcNow -gt $esuEnd) {
      Add-Result "FAIL" "Поддержка безопасности ОС" "Microsoft ESU для Windows Server 2012 R2 завершилась 13 октября 2026 года. Обновите ОС перед установкой."
    } else {
      Add-Result "WARN" "Поддержка безопасности ОС" "Server 2012 R2 допускается только с активными Microsoft ESU и всеми актуальными обновлениями безопасности. Это должен подтвердить администратор сервера."
      if ($InstallerMode) {
        try {
          Add-Type -AssemblyName System.Windows.Forms
          $answer = [System.Windows.Forms.MessageBox]::Show(
            "Windows Server 2012 R2 поддерживается только при активных Microsoft ESU и установленных обновлениях безопасности. Администратор сервера подтвердил выполнение этого требования?",
            "BarDoctor — подтверждение безопасности ОС",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
          )
          if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
            Add-Result "PASS" "Подтверждение ESU" "Администратор подтвердил активные ESU и актуальные security updates."
          } else {
            Add-Result "FAIL" "Подтверждение ESU" "Установка отменена: сначала подтвердите активные ESU и установите все актуальные обновления безопасности."
          }
        } catch {
          Add-Result "FAIL" "Подтверждение ESU" "Не удалось безопасно получить подтверждение ESU. Запустите установку в интерактивной Windows-сессии."
        }
      }
    }
  }
}

if ($PSVersionTable.PSVersion.Major -ge 4) {
  Add-Result "PASS" "PowerShell" ("Версия " + $PSVersionTable.PSVersion.ToString() + "; installer совместим с PowerShell 4.0.")
} else {
  Add-Result "FAIL" "PowerShell" "Нужен Windows PowerShell 4.0 или новее."
}

$release = Get-NetFrameworkRelease
if ($release -ge 528040) {
  Add-Result "PASS" ".NET Framework" ("Обнаружен .NET Framework 4.8, Release=" + $release + ".")
} else {
  Add-Result "FAIL" ".NET Framework" "Нужен .NET Framework 4.8 (Release 528040/528049 или новее)."
}

$compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
if (Test-Path -LiteralPath $compiler) {
  Add-Result "PASS" "C# compiler" "Доступен x86 compiler .NET Framework."
} else {
  Add-Result "FAIL" "C# compiler" "Не найден встроенный x86 compiler .NET Framework. Восстановите .NET Framework 4.8."
}

try {
  Add-Type -AssemblyName System.Security
  $plain = [Text.Encoding]::UTF8.GetBytes("BarDoctor compatibility probe")
  $entropy = [Text.Encoding]::UTF8.GetBytes("BarDoctor.LocalConnector.preflight.v1")
  $protected = [Security.Cryptography.ProtectedData]::Protect($plain, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $unprotected = [Security.Cryptography.ProtectedData]::Unprotect($protected, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  if ([Text.Encoding]::UTF8.GetString($unprotected) -ne "BarDoctor compatibility probe") { throw "DPAPI round-trip mismatch" }
  Add-Result "PASS" "DPAPI" "CurrentUser encryption/decryption работает для текущей учётной записи Windows."
} catch {
  Add-Result "FAIL" "DPAPI" "Текущая учётная запись Windows не смогла защитить локальные секреты."
}

try {
  $probeRoot = Join-Path $env:LOCALAPPDATA "BarDoctor\LocalConnector"
  [IO.Directory]::CreateDirectory($probeRoot) | Out-Null
  $probeFile = Join-Path $probeRoot ("preflight-" + [Guid]::NewGuid().ToString("N") + ".tmp")
  [IO.File]::WriteAllText($probeFile, "BarDoctor queue write probe", [Text.Encoding]::UTF8)
  Remove-Item -LiteralPath $probeFile -Force
  Add-Result "PASS" "Локальная очередь" "LocalAppData доступна для encrypted queue без постоянных прав администратора."
} catch {
  Add-Result "FAIL" "Локальная очередь" ("Нет записи в LocalAppData текущего пользователя: " + $_.Exception.Message)
}

try {
  $runKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey("Software\Microsoft\Windows\CurrentVersion\Run", $true)
  if ($runKey -eq $null) { throw "HKCU Run is not writable" }
  $runKey.Dispose()
  Add-Result "PASS" "Фоновый запуск" "HKCU Run доступен; агент стартует после входа этого пользователя без Windows Service и без постоянных прав администратора."
} catch {
  Add-Result "FAIL" "Фоновый запуск" "Текущему пользователю недоступен безопасный per-user автозапуск."
}

try {
  $powerShell32 = if ([Environment]::Is64BitOperatingSystem) {
    Join-Path $env:WINDIR "SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
  } else {
    Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
  }
  if (-not (Test-Path -LiteralPath $powerShell32)) { throw "32-bit Windows PowerShell is unavailable" }
  $comProbe = @'
$ErrorActionPreference = "Stop"
try {
  $connector = New-Object -ComObject "V82.COMConnector"
  if ($connector -eq $null) { exit 3 }
  [Runtime.InteropServices.Marshal]::FinalReleaseComObject($connector) | Out-Null
  exit 0
} catch { exit 2 }
'@
  & $powerShell32 -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command $comProbe | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "V82.COMConnector is not registered for x86" }
  Add-Result "PASS" "1С COM" "32-bit V82.COMConnector зарегистрирован. База 1С не открывалась."
} catch {
  Add-Result "FAIL" "1С COM" "Не найден 32-bit V82.COMConnector. Установите компонент COM-соединения платформы 1С 8.2."
}

try {
  $server = New-Object System.Uri -ArgumentList ($ServerUrl.Trim().TrimEnd('/') + "/")
  if ($server.Scheme -ne "https") { throw "HTTPS is required" }
  $previousProtocol = [Net.ServicePointManager]::SecurityProtocol
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $healthUri = New-Object System.Uri -ArgumentList $server, "api/healthz"
    $request = [Net.HttpWebRequest]::Create($healthUri)
    $request.Method = "GET"
    $request.Timeout = 15000
    $request.ReadWriteTimeout = 15000
    $request.UserAgent = "BarDoctor-Local-Connector-Compatibility/1.1.0"
    $response = $request.GetResponse()
    try {
      $status = [int]$response.StatusCode
      if ($status -lt 200 -or $status -ge 500) { throw "HTTP " + $status }
    } finally { if ($response -ne $null) { $response.Dispose() } }
  } finally { [Net.ServicePointManager]::SecurityProtocol = $previousProtocol }
  Add-Result "PASS" "TLS 1.2" "Защищённое соединение с BarDoctor установлено с штатной проверкой сертификата Windows."
} catch {
  Add-Result "FAIL" "TLS 1.2" "Не удалось установить TLS 1.2 соединение с BarDoctor. Проверьте обновления Windows, дату/время, корневые сертификаты и firewall."
}

$summary = "Итог: ошибок {0}, предупреждений {1}." -f $script:failures, $script:warnings
$script:results.Add("")
$script:results.Add($summary)
$script:results.Add("Проверка не подключалась к информационной базе 1С и не выполняла запись в 1С.")
$script:results | Out-File -LiteralPath $reportPath -Encoding UTF8
Write-Host ""
Write-Host $summary -ForegroundColor $(if ($script:failures -eq 0) { "Green" } else { "Red" })
Write-Host ("Отчёт: " + $reportPath)

if ($script:failures -gt 0) { exit 1 }
exit 0
