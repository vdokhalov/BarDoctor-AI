$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$job=[Console]::In.ReadToEnd() | ConvertFrom-Json
if($job.action -eq 'protect') {
 $plain=[Text.Encoding]::UTF8.GetBytes([string]$job.value)
 $bytes=[Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 [Console]::Out.Write([Convert]::ToBase64String($bytes))
} elseif($job.action -eq 'unprotect') {
 $bytes=[Convert]::FromBase64String([string]$job.value)
 $plain=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 [Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))
} else { throw 'Invalid credential action' }
