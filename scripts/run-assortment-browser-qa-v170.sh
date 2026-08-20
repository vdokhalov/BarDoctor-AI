#!/usr/bin/env bash
set -euo pipefail

qa_port="${BD_QA_PORT:-4175}"
qa_log="$(mktemp /tmp/bardoctor-assortment-qa.XXXXXX.log)"

npm run dev -- --host 127.0.0.1 --port "$qa_port" >"$qa_log" 2>&1 &
qa_server_pid=$!
cleanup() {
  kill "$qa_server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

qa_ready=0
for _ in $(seq 1 80); do
  if curl -fsS "http://127.0.0.1:${qa_port}/api/healthz" >/dev/null 2>&1; then
    qa_ready=1
    break
  fi
  sleep 0.5
done

if [[ "$qa_ready" != "1" ]]; then
  tail -n 80 "$qa_log"
  echo "Local QA server did not become ready" >&2
  exit 1
fi

NODE_PATH="/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules" \
BD_QA_BASE_URL="http://127.0.0.1:${qa_port}" \
node scripts/assortment-browser-qa-v170.cjs
