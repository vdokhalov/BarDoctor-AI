import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path: string): Promise<string> {
  return readFile(new URL(path, root), "utf8");
}

test("Windows Server 2012 R2 preflight uses only PowerShell 4 compatible primitives", async () => {
  const preflight = await source("local-connector/windows/check-compatibility.ps1");
  const installer = await source("local-connector/windows/install.ps1");
  const command = await source("local-connector/windows/Install-BarDoctor-Local-Connector.cmd");

  assert.match(preflight, /Windows Server 2012 R2/);
  assert.match(preflight, /2026-10-13T23:59:59Z/);
  assert.match(preflight, /\$InstallerMode/);
  assert.match(preflight, /System\.Windows\.Forms\.MessageBox/);
  assert.match(preflight, /DialogResult\]::Yes/);
  assert.match(preflight, /New-Object System\.Version -ArgumentList 6, 3/);
  assert.match(preflight, /PSVersionTable\.PSVersion\.Major -ge 4/);
  assert.match(preflight, /Release 528040\/528049/);
  assert.match(command, /System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
  assert.match(command, /Sysnative\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
  assert.doesNotMatch(preflight + installer, /Get-ItemPropertyValue|Expand-Archive|ForEach-Object\s+-Parallel|\?\?|\?\.|::new\s*\(/);
  assert.doesNotMatch(installer, /OSVersion\.Version\.Major -lt 10|Server 2016 and newer is required/);
});

test("Server 2012 R2 compatibility keeps TLS, DPAPI and queue security intact", async () => {
  const preflight = await source("local-connector/windows/check-compatibility.ps1");
  const program = await source("local-connector/windows/src/01_Program.cs");
  const security = await source("local-connector/windows/src/02_SecurityQueue.cs");
  const client = await source("local-connector/windows/src/03_BarDoctorClient.cs");
  const config = await source("local-connector/windows/BarDoctor.LocalConnector.exe.config");
  const installer = await source("local-connector/windows/install.ps1");

  assert.match(preflight, /SecurityProtocolType\]::Tls12/);
  assert.match(preflight, /HttpWebRequest/);
  assert.match(preflight, /api\/healthz/);
  assert.doesNotMatch(preflight + client, /ServerCertificateValidationCallback|ICertificatePolicy|SkipCertificateCheck|TrustAll|TLS 1\.0|Tls11/);
  assert.match(program, /SecurityProtocolType\)3072/);
  assert.match(client, /UriSchemeHttps/);
  assert.match(preflight, /ProtectedData\]::Protect/);
  assert.match(preflight, /ProtectedData\]::Unprotect/);
  assert.match(preflight, /DataProtectionScope\]::CurrentUser/);
  assert.match(security, /DataProtectionScope\.CurrentUser/);
  assert.match(security, /LocalApplicationData/);
  assert.match(config, /\.NETFramework,Version=v4\.8/);
  assert.match(config, /DontEnableSchUseStrongCrypto=false/);
  assert.doesNotMatch(preflight + installer, /SCHANNEL\\Protocols|DisabledByDefault|ServicePointManager\.ServerCertificateValidationCallback/);
});

test("background execution remains per-user and needs no permanent administrator", async () => {
  const preflight = await source("local-connector/windows/check-compatibility.ps1");
  const installer = await source("local-connector/windows/install.ps1");
  const readme = await source("local-connector/windows/README.md");

  assert.match(installer, /\$env:LOCALAPPDATA/);
  assert.match(installer, /HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run/);
  assert.match(preflight, /Registry\]::CurrentUser\.OpenSubKey/);
  assert.match(readme, /не устанавливает Windows\s+Service/);
  assert.doesNotMatch(preflight + installer, /New-Service|(?:^|\s)sc\.exe|nssm|Start-Process[^\n]+-Verb\s+RunAs|HKLM:\\SYSTEM\\CurrentControlSet\\Services/im);
  assert.ok(
    installer.indexOf("check-compatibility.ps1") < installer.indexOf("New-Item -ItemType Directory -Path $installRoot"),
    "compatibility preflight must finish before installation writes",
  );
});

test("1C compatibility probe and adapter never read the 1Cv8.1CD file directly", async () => {
  const preflight = await source("local-connector/windows/check-compatibility.ps1");
  const adapter = await source("local-connector/windows/src/04_OneCAdapter.cs");
  const callLines = adapter.split("\n").filter((line) => line.includes("ComAccess.Call"));

  assert.match(preflight, /SysWOW64\\WindowsPowerShell/);
  assert.match(preflight, /V82\.COMConnector/);
  assert.doesNotMatch(preflight, /\.Connect\(|Соединить|InfoBasePath|1Cv8\.1CD/);
  assert.doesNotMatch(adapter, /1Cv8\.1CD|File\.Open\(|FileStream|ReadAllBytes/);
  assert.match(adapter, /Type\.GetTypeFromProgID\("V82\.COMConnector"/);
  assert.match(adapter, /EnsureSelectOnly\(queryText\)/);
  assert.doesNotMatch(callLines.join("\n"), /["'](?:Write|Записать|Post|Провести|Delete|Удалить|BeginTransaction|НачатьТранзакцию)["']/i);
});

test("v1.1.0 distribution contains preflight, config and a valid checksum", async () => {
  const version = (await source("local-connector/windows/VERSION")).trim();
  assert.equal(version, "1.1.0");
  const archive = await readFile(new URL("public/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip", root));
  const checksum = await source("public/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip.sha256");
  assert.equal(createHash("sha256").update(archive).digest("hex"), checksum.trim().split(/\s+/)[0]);
  const centralDirectory = archive.toString("latin1");
  for (const required of [
    "Check-BarDoctor-Compatibility.cmd",
    "check-compatibility.ps1",
    "BarDoctor.LocalConnector.exe.config",
    "Install-BarDoctor-Local-Connector.cmd",
    "README.txt",
  ]) assert.match(centralDirectory, new RegExp(required.replaceAll(".", "\\.")));
});

test("production build cannot omit or mutate the v1.1.0 download", async () => {
  const validator = await source("scripts/validate-artifact.sh");
  const integrationUi = await source("public/integrations.js");
  const healthRoute = await source("app/api/integration/v1/health/route.ts");

  assert.match(validator, /dist\/client\/downloads\/BarDoctor-Local-Connector-Windows-v1\.1\.0\.zip/);
  assert.match(validator, /88567cf5bbee9d2416e30d43ced9258f981f738c14ea2f1bb6b0aff9c554160a/);
  assert.match(integrationUi, /CONNECTOR_DOWNLOAD = "\/downloads\/BarDoctor-Local-Connector-Windows-v1\.1\.0\.zip"/);
  assert.match(integrationUi, /iconName === "download"\) result\.download/);
  assert.match(healthRoute, /downloadUrl: "\/downloads\/BarDoctor-Local-Connector-Windows-v1\.1\.0\.zip"/);
});
