#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
webkit_root="${project_root}/.sites-runtime/browsers/webkit-2248/minibrowser-wpe"
webkit_dependencies="${project_root}/.sites-runtime/webkit-deps/root/usr/lib/x86_64-linux-gnu"
[[ -x "${webkit_root}/bin/MiniBrowser" && -d "${webkit_dependencies}" ]] || {
  echo 'Official WebKit 2248 and workspace-local verified Debian dependencies are required.' >&2
  exit 1
}
# Run the installed matching binary with the same bundle paths as its official
# launcher, retaining workspace-local libraries. No OS install, ldconfig update,
# sandbox change, or Playwright dependency-validation override is performed.
export LD_LIBRARY_PATH="${webkit_dependencies}:${webkit_root}/lib:${webkit_root}/sys/lib"
export WEBKIT_EXEC_PATH="${webkit_root}/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="${webkit_root}/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="${webkit_root}/share"
export WEBKIT_FORCE_COMPLEX_TEXT=1
export BD_WEBKIT_EXECUTABLE="${webkit_root}/bin/MiniBrowser"
export BD_CURATED_BROWSER=webkit
cd "${project_root}"
exec node --import tsx scripts/health-doctor-recovery-browser.mjs
