#!/usr/bin/env bash
#
# P0 HTTP smoke test for the backend spine.
#
# Prereqs: CRM binary on :8080 AND this app on :3000 (npm run dev), run from the
# project root:  bash scripts/test-p0.sh
#
# Covers: auth (login/wrong-pw/no-session), the CRM proxy, event create ->
# sqlite -> feed, unknown room 404, event validation 400s, the read-only CRM
# boundary, and the concurrent room-create guard (the one real race path).

set -u
APP="${APP_URL:-http://localhost:3000}"
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS: $1 ($3)"; pass=$((pass+1)); else echo "FAIL: $1 (expected $2, got $3)"; fail=$((fail+1)); fi; }

JAR=$(mktemp)

echo "== auth =="
check "login wrong password -> 401" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sarah.chen@salesroom.io","password":"nope"}')"
check "accounts without session -> 401" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' "$APP/api/accounts")"
check "login correct -> 200" 200 \
  "$(curl -s -c "$JAR" -o /dev/null -w '%{http_code}' -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sarah.chen@salesroom.io","password":"demo1234"}')"
grep -q sf_session "$JAR" && { echo "PASS: session cookie set"; pass=$((pass+1)); } || { echo "FAIL: session cookie set"; fail=$((fail+1)); }

echo "== CRM proxy (read layer) =="
check "listAccounts with session -> 3" 3 \
  "$(curl -s -b "$JAR" "$APP/api/accounts" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["accounts"]))')"

echo "== rooms =="
curl -s -b "$JAR" -o /tmp/p0room.json -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_001"}'
SLUG=$(python3 -c 'import json;print(json.load(open("/tmp/p0room.json"))["room"]["slug"])')
check "create room seeds 16 resources" 16 \
  "$(python3 -c 'import json;print(len(json.load(open("/tmp/p0room.json"))["resources"]))')"
check "unknown room slug -> 404" 404 \
  "$(curl -s -o /dev/null -w '%{http_code}' "$APP/api/rooms/this-does-not-exist")"

echo "== events -> sqlite -> feed =="
check "valid event -> 201" 201 \
  "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$APP/api/events" -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\",\"type\":\"ROOM_VIEWED\"}")"
check "feed returns the event" 1 \
  "$(curl -s -b "$JAR" "$APP/api/events?slug=$SLUG" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["events"]))')"
check "bad event type -> 400" 400 \
  "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$APP/api/events" -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\",\"type\":\"BOGUS\"}")"
check "video event missing content_id -> 400" 400 \
  "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$APP/api/events" -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\",\"type\":\"VIDEO_PLAYED\"}")"
check "malformed JSON body -> 400" 400 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d '{bad json')"

echo "== role guard =="
JARB=$(mktemp)
curl -s -c "$JARB" -o /dev/null -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"p.sharma@velorahealth.com","password":"demo1234"}'
check "buyer creating a room -> 403" 403 \
  "$(curl -s -b "$JARB" -o /dev/null -w '%{http_code}' -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_002"}')"

echo "== concurrency guard: 8 parallel create requests for one account =="
for n in $(seq 1 8); do
  curl -s -b "$JAR" -o "/tmp/p0cc_$n.json" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_003"}' &
done
wait
errs=0
for n in $(seq 1 8); do grep -q '"error"' "/tmp/p0cc_$n.json" && errs=$((errs+1)); done
check "no errors across 8 concurrent creates" 0 "$errs"
ROOMS=$(node -e 'const D=require("better-sqlite3");const db=new D("./data/salesroom.db");console.log(db.prepare("SELECT COUNT(*) c FROM rooms WHERE account_id=?").get("acc_003").c)')
check "exactly one room created for the account" 1 "$ROOMS"

echo "== read-only CRM boundary =="
# Static guard: all CRM access goes through crmFetch in src/lib/crm.ts, where the
# only non-GET method must be the auth/login POST. (PRD: grep for non-GET CRM
# calls before submitting -> should be only auth/login.)
NONGET=$(grep -cE 'method:[[:space:]]*"(POST|PUT|PATCH|DELETE)"' src/lib/crm.ts)
check "exactly one non-GET CRM call (auth/login)" 1 "$NONGET"

echo
echo "RESULTS: pass=$pass fail=$fail"
rm -f "$JAR" "$JARB"
[ "$fail" -eq 0 ]
