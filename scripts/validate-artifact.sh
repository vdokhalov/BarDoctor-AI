#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"
connector_zip="${SITES_PROJECT_ROOT}/dist/client/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip"
connector_checksum="${SITES_PROJECT_ROOT}/dist/client/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip.sha256"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}
[[ -f "${connector_zip}" ]] || {
  echo "Missing Local Connector v1.1.0 production artifact" >&2
  exit 66
}
[[ -f "${connector_checksum}" ]] || {
  echo "Missing Local Connector v1.1.0 checksum" >&2
  exit 66
}

node --input-type=module - "${worker}" "${hosting}" "${connector_zip}" "${connector_checksum}" <<'NODE'
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [workerPath, hostingPath, connectorPath, checksumPath] = process.argv.slice(2);
const hosting = JSON.parse(await readFile(hostingPath, "utf8"));
const workerSource = await readFile(workerPath, "utf8");
const connector = await readFile(connectorPath);
const expectedChecksum = (await readFile(checksumPath, "utf8")).trim().split(/\s+/)[0];
const actualChecksum = createHash("sha256").update(connector).digest("hex");

if (!connector.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
  throw new Error("Local Connector production artifact is not a ZIP archive");
}
if (actualChecksum !== expectedChecksum) {
  throw new Error(`Local Connector checksum mismatch: ${actualChecksum}`);
}
if (actualChecksum !== "88567cf5bbee9d2416e30d43ced9258f981f738c14ea2f1bb6b0aff9c554160a") {
  throw new Error("Unexpected Local Connector v1.1.0 checksum");
}

// A Worker that uses native Cloudflare bindings imports the `cloudflare:` URL
// scheme. Node cannot evaluate that scheme, so validate the emitted Worker
// contract statically in that case. The Sites runtime performs the real module
// load when the checkpoint is deployed.
const usesCloudflareRuntime =
  workerSource.includes('from "cloudflare:') ||
  workerSource.includes("from 'cloudflare:") ||
  hosting.d1 !== null ||
  hosting.r2 !== null;

if (usesCloudflareRuntime) {
  const hasDefaultExport =
    /export\s*\{[^}]*\bas default\b[^}]*\}/s.test(workerSource) ||
    /export\s+default\b/.test(workerSource);
  const hasFetchHandler = /\basync\s+fetch\s*\(/.test(workerSource);

  if (!hasDefaultExport || !hasFetchHandler) {
    throw new Error(
      "dist/server/index.js must have an ESM default export with fetch(request, env, ctx)",
    );
  }
  process.exit(0);
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("sites-validation", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}
NODE

echo "Validated Sites artifact: ESM Worker default.fetch and hosting manifest are present."
