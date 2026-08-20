#!/usr/bin/env bash
set -euo pipefail

connector_root="$(cd "$(dirname "$0")/.." && pwd)"
project_root="$(cd "$connector_root/../.." && pwd)"
version="$(tr -d '\r\n' < "$connector_root/VERSION")"
output_dir="$project_root/public/downloads"
package_name="BarDoctor-Local-Connector-Windows-v${version}"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

mkdir -p "$staging/$package_name/src" "$output_dir"
cp "$connector_root/Install-BarDoctor-Local-Connector.cmd" "$staging/$package_name/"
cp "$connector_root/Check-BarDoctor-Compatibility.cmd" "$staging/$package_name/"
cp "$connector_root/Uninstall-BarDoctor-Local-Connector.cmd" "$staging/$package_name/"
cp "$connector_root/install.ps1" "$staging/$package_name/"
cp "$connector_root/check-compatibility.ps1" "$staging/$package_name/"
cp "$connector_root/uninstall.ps1" "$staging/$package_name/"
cp "$connector_root/BarDoctor.LocalConnector.exe.config" "$staging/$package_name/"
cp "$connector_root/VERSION" "$staging/$package_name/"
cp "$connector_root/README.md" "$staging/$package_name/README.txt"
cp "$connector_root/src/"*.cs "$staging/$package_name/src/"

(
  cd "$staging"
  zip -q -9 -r "$output_dir/$package_name.zip" "$package_name"
)
(cd "$output_dir" && sha256sum "$package_name.zip" > "$package_name.zip.sha256")
echo "$output_dir/$package_name.zip"
