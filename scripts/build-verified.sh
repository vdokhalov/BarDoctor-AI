#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout >/dev/null || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci before building." >&2
  exit 69
fi

before_status="$(git -C "${SITES_PROJECT_ROOT}" status --porcelain=v1 --untracked-files=no)"

node "${script_dir}/validate-build-secrets.mjs"

echo "Running bounded, source-read-only vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

node "${script_dir}/version-built-client-asset.mjs"
node "${script_dir}/verify-versioned-client-asset-v379.mjs"
"${script_dir}/validate-artifact.sh"
node "${script_dir}/generate-release-manifest.mjs"

after_status="$(git -C "${SITES_PROJECT_ROOT}" status --porcelain=v1 --untracked-files=no)"
if [[ "${after_status}" != "${before_status}" ]]; then
  echo "Build changed tracked source. Release artifact rejected." >&2
  git -C "${SITES_PROJECT_ROOT}" status --short >&2
  git -C "${SITES_PROJECT_ROOT}" diff --stat >&2
  exit 65
fi

echo "Verified build: tracked source unchanged."
