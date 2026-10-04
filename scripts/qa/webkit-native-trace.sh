#!/usr/bin/env bash
set -euo pipefail
ulimit -c 0
: "${BD_WEBKIT_REAL_EXECUTABLE:?actual Playwright WebKit executable required}"
: "${BD_WEBKIT_PROCESS_TRACE:?native process evidence path required}"
# Process identities and fatal signals only: no network, storage or token contents.
exec strace -f -ttt -s 256 -e trace=process -e signal=SIGABRT,SIGSEGV \
  -o "$BD_WEBKIT_PROCESS_TRACE" "$BD_WEBKIT_REAL_EXECUTABLE" "$@"
