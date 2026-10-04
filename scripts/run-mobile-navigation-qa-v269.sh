#!/usr/bin/env bash
set -euo pipefail

qa_port="${BD_QA_PORT:-4175}"
qa_log="$(mktemp /tmp/bardoctor-mobile-navigation-qa.XXXXXX.log)"

# Run the same Vite CLI as npm dev directly so teardown can await the server itself.
WRANGLER_LOG_PATH=.wrangler/wrangler.log setsid node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$qa_port" --strictPort >"$qa_log" 2>&1 &
qa_server_pid=$!
cleanup() {
  # Stop the QA server and all of its children, not only the npm wrapper.
  kill -- "-$qa_server_pid" 2>/dev/null || true
  wait "$qa_server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

qa_ready=0
for _ in $(seq 1 80); do
  if ! kill -0 "$qa_server_pid" 2>/dev/null; then break; fi
  if curl -fsS "http://127.0.0.1:${qa_port}/api/healthz" >/dev/null 2>&1; then
    qa_ready=1
    break
  fi
  sleep 0.5
done

if [[ "$qa_ready" != "1" ]]; then
  tail -n 80 "$qa_log"
  echo "Local mobile QA server did not become ready" >&2
  exit 1
fi

BD_QA_BASE_URL="http://127.0.0.1:${qa_port}" \
TMPDIR="${BD_QA_TMPDIR:-/tmp}" \
node scripts/mobile-navigation-qa-v269.cjs
