#!/usr/bin/env bash
#
# P3 HTTP smoke test for feed insights.
#
# Prereqs: CRM binary on :8080 AND this app on :3000 (npm run dev), run from the
# project root:  bash scripts/test-p3.sh
#
# Covers: two buyers engaging (multi-threading), top-stakeholder + most-viewed +
# follow-up insight cards, unique-visitor count, rep preview events excluded from
# insights but tagged in the feed, and empty insights on a fresh room.

set -u
APP="${APP_URL:-http://localhost:3000}"
CRM="${CRM_URL:-http://localhost:8080}"
pass=0; fail=0
contains()    { if printf '%s' "$3" | grep -q -- "$2"; then echo "PASS: $1"; pass=$((pass+1)); else echo "FAIL: $1 (missing: $2)"; fail=$((fail+1)); fi; }
notcontains() { if printf '%s' "$3" | grep -q -- "$2"; then echo "FAIL: $1 (should be absent: $2)"; fail=$((fail+1)); else echo "PASS: $1"; pass=$((pass+1)); fi; }

REP=$(mktemp); PS=$(mktemp); ER=$(mktemp)
login() { curl -s -c "$1" -o /dev/null -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"demo1234\"}"; }
login "$REP" "sarah.chen@salesroom.io"
login "$PS" "p.sharma@velorahealth.com"
login "$ER" "e.rodriguez@velorahealth.com"

# Names as the app will render them (from the JWT).
PNAME=$(curl -s -b "$PS" "$APP/api/auth/me" | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["name"])')

# A video content id + title from the CRM (drives most-viewed + follow-up).
TOK=$(curl -s -X POST "$CRM/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sarah.chen@salesroom.io","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
read VID VIDTITLE <<<"$(curl -s "$CRM/api/content" -H "Authorization: Bearer $TOK" | python3 -c '
import sys,json
d=json.load(sys.stdin); items=d["content"] if isinstance(d,dict) and "content" in d else d
v=next(x for x in items if x["type"]=="video"); print(v["id"], v["title"])')"
DOCID=$(curl -s "$CRM/api/content" -H "Authorization: Bearer $TOK" | python3 -c '
import sys,json
d=json.load(sys.stdin); items=d["content"] if isinstance(d,dict) and "content" in d else d
print(next(c for c in items if c["type"]!="video")["id"])')

# Rooms: Velora (engaged) + Meridian (fresh).
VEL=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_002"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')
MER=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_001"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')

post() { curl -s -o /dev/null -b "$1" -X POST "$APP/api/events" -H 'Content-Type: application/json' -d "$2"; }
# p.sharma: 4 events (3 on the video) -> top stakeholder + most-viewed.
post "$PS" "{\"slug\":\"$VEL\",\"type\":\"ROOM_VIEWED\"}"
post "$PS" "{\"slug\":\"$VEL\",\"type\":\"VIDEO_PLAYED\",\"content_id\":\"$VID\"}"
post "$PS" "{\"slug\":\"$VEL\",\"type\":\"VIDEO_PROGRESS\",\"content_id\":\"$VID\",\"metadata\":{\"percent\":50,\"seconds\":42}}"
post "$PS" "{\"slug\":\"$VEL\",\"type\":\"VIDEO_COMPLETED\",\"content_id\":\"$VID\"}"
# e.rodriguez: 2 events -> second visitor.
post "$ER" "{\"slug\":\"$VEL\",\"type\":\"ROOM_VIEWED\"}"
post "$ER" "{\"slug\":\"$VEL\",\"type\":\"RESOURCE_OPENED\",\"content_id\":\"$DOCID\"}"
# rep preview: should be excluded from insights but tagged in the feed.
post "$REP" "{\"slug\":\"$VEL\",\"type\":\"VIDEO_PLAYED\",\"content_id\":\"$DOCID\"}"

echo "== insights on the engaged room =="
PAGE=$(curl -s -b "$REP" "$APP/seller/rooms/$VEL")
contains "insights section present" "Insights" "$PAGE"
contains "top stakeholder is the most active buyer" "$PNAME" "$PAGE"
contains "most-viewed resource is the video" "$VIDTITLE" "$PAGE"
contains "suggested follow-up rendered" "walkthrough" "$PAGE"
contains "two unique visitors counted" "2 visitors" "$PAGE"
contains "rep preview tagged in feed" "preview" "$PAGE"

echo "== fresh room shows empty insights =="
FRESH=$(curl -s -b "$REP" "$APP/seller/rooms/$MER")
contains "fresh room empty insight state" "No engagement yet" "$FRESH"

echo
echo "RESULTS: pass=$pass fail=$fail"
rm -f "$REP" "$PS" "$ER"
[ "$fail" -eq 0 ]
