#!/usr/bin/env bash
set -euo pipefail
# Test-runtime-only fix for Playwright #42803 / WebKit PR74619.
# Bundle3.6.5 double-finishes async requests and corrupts WPENetworkProcess.
# Build the upstream fixed release; do not modify browser binaries or app tests.
: "${1:?absolute build directory required}"
case "$1" in /*) ;; *) echo "Build directory must be absolute" >&2; exit 1;; esac
build_root="$1"
mkdir -p "$build_root"
archive="$build_root/libsoup-3.6.6.tar.xz"
curl --fail --location --retry 2 https://download.gnome.org/sources/libsoup/3.6/libsoup-3.6.6.tar.xz --output "$archive"
printf '%s  %s\n' 51ed0ae06f9d5a40f401ff459e2e5f652f9a510b7730e1359ee66d14d4872740 "$archive" | sha256sum --check --strict
tar -xJf "$archive" -C "$build_root"
meson setup "$build_root/build" "$build_root/libsoup-3.6.6" --buildtype=release -Ddocs=disabled -Dintrospection=disabled -Dvapi=disabled -Dtests=false -Dsysprof=disabled -Dgssapi=disabled -Dntlm=disabled
meson compile -C "$build_root/build"
library="$build_root/build/libsoup/libsoup-3.0.so.0"
python3 - "$library" <<'VERIFY'
import ctypes, hashlib, json, pathlib, sys
path=pathlib.Path(sys.argv[1]).resolve()
soup=ctypes.CDLL(str(path))
version=[getattr(soup,'soup_get_'+part+'_version')() for part in ['major','minor','micro']]
assert version==[3,6,6], version
record={'version':version,'library':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceSHA256':'51ed0ae06f9d5a40f401ff459e2e5f652f9a510b7730e1359ee66d14d4872740','upstream':'https://github.com/WebKit/WebKit/pull/74619'}
pathlib.Path('outputs/webkit-runtime').mkdir(parents=True,exist_ok=True)
pathlib.Path('outputs/webkit-runtime/libsoup.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
VERIFY
# MiniBrowser replaces LD_LIBRARY_PATH; upstream recommends explicit preload.
if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'LD_PRELOAD=%s\n' "$library" >> "$GITHUB_ENV"
fi
