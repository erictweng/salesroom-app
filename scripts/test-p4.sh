#!/usr/bin/env bash
#
# P4 HTTP smoke test for polish: reorder, hide/unhide, and the demo seed.
#
# Prereqs: CRM binary on :8080 AND this app on :3000 (npm run dev), run from the
# project root:  bash scripts/test-p4.sh
#
# The reorder/hide *mutations* are unit-tested in src/lib/__tests__/repo.test.ts;
# here we set DB state directly (as the rep actions would) and verify it is
# REFLECTED correctly — flat ordered list + hidden label in the seller manager,
# hidden excluded in the buyer view — plus the `npm run seed` demo events.

set -u
APP="${APP_URL:-http://localhost:3000}"
CRM="${CRM_URL:-http://localhost:8080}"
pass=0; fail=0
contains()    { if printf '%s' "$3" | grep -q -- "$2"; then echo "PASS: $1"; pass=$((pass+1)); else echo "FAIL: $1 (missing: $2)"; fail=$((fail+1)); fi; }
notcontains() { if printf '%s' "$3" | grep -q -- "$2"; then echo "FAIL: $1 (should be absent: $2)"; fail=$((fail+1)); else echo "PASS: $1"; pass=$((pass+1)); fi; }
check()       { if [ "$2" = "$3" ]; then echo "PASS: $1 ($3)"; pass=$((pass+1)); else echo "FAIL: $1 (expected $2, got $3)"; fail=$((fail+1)); fi; }

REP=$(mktemp); PS=$(mktemp)
login() { curl -s -c "$1" -o /dev/null -X POST "$APP/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"demo1234\"}"; }
login "$REP" "sarah.chen@salesroom.io"
login "$PS" "p.sharma@velorahealth.com"

# Resolve a few content titles from the CRM (stable seed ids).
TOK=$(curl -s -X POST "$CRM/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sarah.chen@salesroom.io","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
title() { curl -s "$CRM/api/content/$1" -H "Authorization: Bearer $TOK" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("content",d).get("title"))'; }
T_DOC=$(title cnt_002)      # to hide
T_ANALYTICS=$(title cnt_011) # forced first
T_PLATFORM=$(title cnt_001)  # forced later

VEL=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_002"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')
MER=$(curl -s -b "$REP" -X POST "$APP/api/rooms" -H 'Content-Type: application/json' -d '{"account_id":"acc_001"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')

# Setup: publish VEL, hide cnt_002, force cnt_011 before cnt_001 (as reorder would).
node -e '
const D=require("better-sqlite3"); const db=new D("./data/salesroom.db");
const slug=process.argv[1];
db.prepare("UPDATE rooms SET status=? WHERE slug=?").run("published", slug);
const r=db.prepare("SELECT id FROM rooms WHERE slug=?").get(slug);
db.prepare("UPDATE room_resources SET hidden=1 WHERE room_id=? AND content_id=?").run(r.id,"cnt_002");
db.prepare("UPDATE room_resources SET position=-1 WHERE room_id=? AND content_id=?").run(r.id,"cnt_011");
db.prepare("UPDATE room_resources SET position=50 WHERE room_id=? AND content_id=?").run(r.id,"cnt_001");
' "$VEL"

echo "== seller content manager reflects order + hidden =="
SELLER=$(curl -s -b "$REP" "$APP/seller/rooms/$VEL")
contains "hidden item shows Unhide control" "Unhide" "$SELLER"
contains "hidden item labeled Hidden" "Hidden" "$SELLER"
# Order: forced-first title should appear before the forced-later title.
ORD=$(python3 - "$SELLER" "$T_ANALYTICS" "$T_PLATFORM" <<'PY'
import sys
html, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
ia, ib = html.find(a), html.find(b)
print("OK" if 0 <= ia < ib else "BAD")
PY
)
check "reordered: forced-first before forced-later" "OK" "$ORD"

echo "== buyer view reflects hide =="
BUYER=$(curl -s -b "$PS" "$APP/room/$VEL")
notcontains "hidden resource excluded for buyer" "$T_DOC" "$BUYER"
contains "visible resource shown for buyer" "$T_PLATFORM" "$BUYER"

echo "== npm run seed populates fresh rooms =="
npm run seed --silent >/dev/null 2>&1 || node scripts/seed-demo.mjs >/dev/null 2>&1
contains "seeded buyer appears in Meridian feed" "David Park" "$(curl -s -b "$REP" "$APP/seller/rooms/$MER")"

echo
echo "RESULTS: pass=$pass fail=$fail"
rm -f "$REP" "$PS"
[ "$fail" -eq 0 ]
