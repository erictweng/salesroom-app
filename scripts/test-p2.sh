#!/usr/bin/env bash
#
# P2 HTTP smoke test for the buyer loop.
#
# Prereqs: CRM binary on :8080 AND this app on :3000 (npm run dev), run from the
# project root:  bash scripts/test-p2.sh
#
# Covers: unauth -> login prompt, published room visible to its buyer, hidden
# resource excluded, cross-account -> not authorized, draft -> not published, all
# six event types accepted, and the rep feed rendering a rich attributed line.
#
# Note: room publish + a hidden flag are set directly in SQLite here (test setup)
# the same way the publish action / P4 hide would; this script focuses on buyer
# behavior given that state.

set -u
APP="${APP_URL:-http://localhost:3000}"
CRM="${CRM_URL:-http://localhost:8080}"
pass=0; fail=0

check()       { if [ "$2" = "$3" ]; then echo "PASS: $1 ($3)"; pass=$((pass+1)); else echo "FAIL: $1 (expected $2, got $3)"; fail=$((fail+1)); fi; }
contains()    { if printf '%s' "$3" | grep -q -- "$2"; then echo "PASS: $1"; pass=$((pass+1)); else echo "FAIL: $1 (missing: $2)"; fail=$((fail+1)); fi; }
notcontains() { if printf '%s' "$3" | grep -q -- "$2"; then echo "FAIL: $1 (should be absent: $2)"; fail=$((fail+1)); else echo "PASS: $1"; pass=$((pass+1)); fi; }

REP=$(mktemp); PSHARMA=$(mktemp); DPARK=$(mktemp)
login() { curl -s -c "$1" -o /dev/null -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"demo1234\"}"; }
login "$REP" "sarah.chen@salesroom.io"
login "$PSHARMA" "p.sharma@velorahealth.com"
login "$DPARK" "d.park@meridianrobotics.com"

# CRM token to inspect the content catalog directly.
TOK=$(curl -s -X POST "$CRM/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sarah.chen@salesroom.io","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
read VID VIDTITLE <<<"$(curl -s "$CRM/api/content" -H "Authorization: Bearer $TOK" | python3 -c '
import sys,json
d=json.load(sys.stdin); items=d["content"] if isinstance(d,dict) and "content" in d else d
v=next(x for x in items if x["type"]=="video"); print(v["id"], v["title"])')"
read DOCID DOCTITLE <<<"$(curl -s "$CRM/api/content" -H "Authorization: Bearer $TOK" | python3 -c '
import sys,json
d=json.load(sys.stdin); items=d["content"] if isinstance(d,dict) and "content" in d else d
x=next(c for c in items if c["type"]!="video"); print(x["id"], x["title"])')"

# Create a Velora room (acc_002) and a Meridian room (acc_001).
VEL=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_002"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')
MER=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_001"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')

# Setup: publish Velora (leave Meridian draft) and hide one doc in Velora.
node -e '
const D=require("better-sqlite3"); const db=new D("./data/salesroom.db");
db.prepare("UPDATE rooms SET status=? WHERE slug=?").run("published", process.argv[1]);
const r=db.prepare("SELECT id FROM rooms WHERE slug=?").get(process.argv[1]);
db.prepare("UPDATE room_resources SET hidden=1 WHERE room_id=? AND content_id=?").run(r.id, process.argv[2]);
' "$VEL" "$DOCID"

echo "== unauthenticated -> login prompt =="
contains "unauth shows buyer login" "Sign in to view this room" "$(curl -s "$APP/room/$VEL")"

echo "== published room visible to its buyer; hidden resource excluded =="
B=$(curl -s -b "$PSHARMA" "$APP/room/$VEL")
contains "buyer sees welcome hero" "Welcome," "$B"
contains "buyer sees a video resource" "$VIDTITLE" "$B"
notcontains "hidden resource is excluded" "$DOCTITLE" "$B"

echo "== cross-account buyer -> not authorized =="
contains "d.park blocked from Velora" "don't have access" "$(curl -s -b "$DPARK" "$APP/room/$VEL")"

echo "== draft room -> not published (authorized buyer) =="
contains "Meridian draft not shown" "isn't published yet" "$(curl -s -b "$DPARK" "$APP/room/$MER")"

echo "== all six event types accepted (201) =="
post() { curl -s -o /dev/null -w "%{http_code}" -b "$PSHARMA" -X POST "$APP/api/events" -H 'Content-Type: application/json' -d "$1"; }
check "ROOM_VIEWED"        201 "$(post "{\"slug\":\"$VEL\",\"type\":\"ROOM_VIEWED\"}")"
check "RESOURCE_OPENED"    201 "$(post "{\"slug\":\"$VEL\",\"type\":\"RESOURCE_OPENED\",\"content_id\":\"$DOCID\"}")"
check "RESOURCE_REVISITED" 201 "$(post "{\"slug\":\"$VEL\",\"type\":\"RESOURCE_REVISITED\",\"content_id\":\"$DOCID\"}")"
check "VIDEO_PLAYED"       201 "$(post "{\"slug\":\"$VEL\",\"type\":\"VIDEO_PLAYED\",\"content_id\":\"$VID\"}")"
check "VIDEO_PROGRESS"     201 "$(post "{\"slug\":\"$VEL\",\"type\":\"VIDEO_PROGRESS\",\"content_id\":\"$VID\",\"metadata\":{\"percent\":50,\"seconds\":42}}")"
check "VIDEO_COMPLETED"    201 "$(post "{\"slug\":\"$VEL\",\"type\":\"VIDEO_COMPLETED\",\"content_id\":\"$VID\"}")"

echo "== rep feed renders a rich, attributed line =="
FEED=$(curl -s -b "$REP" "$APP/seller/rooms/$VEL")
contains "feed shows watch-time line" "for 42 seconds" "$FEED"

echo
echo "RESULTS: pass=$pass fail=$fail"
rm -f "$REP" "$PSHARMA" "$DPARK"
[ "$fail" -eq 0 ]
