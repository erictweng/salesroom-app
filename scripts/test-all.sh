#!/usr/bin/env bash
#
# Run the whole test suite for the Salesroom app:
#   1. Vitest unit/component tests (always — no servers needed).
#   2. The P0–P4 HTTP smoke tests (only if the CRM :8080 and app :3000 are up).
#
# Usage:  bash scripts/test-all.sh   (or: npm run test:all)
#
# The HTTP scripts need the CRM binary AND `npm run dev` running. If either is
# down, those phases are skipped (not failed) with a hint, so the unit suite can
# still run anywhere (CI, a fresh clone, this sandbox).

set -u
cd "$(dirname "$0")/.."

APP_URL="${APP_URL:-http://localhost:3000}"
CRM_URL="${CRM_BASE_URL:-http://localhost:8080}"
fails=0

hr() { printf '\n────────────────────────────────────────\n'; }
up() { curl -s -o /dev/null --max-time 2 "$1" 2>/dev/null; }  # 0 if reachable

hr; echo "1/2  Unit + component tests (vitest)"; hr
if npx vitest run; then
  echo "✓ vitest passed"
else
  echo "✗ vitest failed"
  fails=$((fails + 1))
fi

hr; echo "2/2  HTTP smoke tests (P0–P4)"; hr
if up "$CRM_URL" && up "$APP_URL"; then
  for phase in p0 p1 p2 p3 p4; do
    echo
    echo "== test-$phase =="
    if bash "scripts/test-$phase.sh"; then
      echo "✓ test-$phase passed"
    else
      echo "✗ test-$phase failed"
      fails=$((fails + 1))
    fi
  done
else
  echo "⏭  Skipped — need the CRM ($CRM_URL) and the app ($APP_URL) running."
  echo "   Start both, then re-run:  npm run test:all"
fi

hr
if [ "$fails" -eq 0 ]; then
  echo "ALL PASSED ✅"
else
  echo "FAILURES: $fails ❌"
fi
hr
exit "$fails"
