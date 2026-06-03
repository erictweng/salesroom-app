#!/usr/bin/env bash
#
# P1 HTTP smoke test for the seller portal.
#
# Prereqs: the CRM binary running on :8080 AND this app running on :3000
# (npm run dev). Run from the project root:  bash scripts/test-p1.sh
#
# Verifies: rep login, account picker lists 3 accounts, one-click create seeds
# 16 resources, the room renders modules A/B/C, and buyers are blocked from
# seller routes.

set -u
APP="${APP_URL:-http://localhost:3000}"
JAR="$(mktemp)"
JARB="$(mktemp)"
pass=0
fail=0

check() { # desc expected actual
  if [ "$2" = "$3" ]; then
    echo "PASS: $1 ($3)"
    pass=$((pass + 1))
  else
    echo "FAIL: $1 (expected $2, got $3)"
    fail=$((fail + 1))
  fi
}
contains() { # desc needle haystack
  if printf '%s' "$3" | grep -q -- "$2"; then
    echo "PASS: $1"
    pass=$((pass + 1))
  else
    echo "FAIL: $1 (missing: $2)"
    fail=$((fail + 1))
  fi
}

echo "== rep login =="
code=$(curl -s -c "$JAR" -o /dev/null -w "%{http_code}" -X POST "$APP/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"sarah.chen@salesroom.io","password":"demo1234"}')
check "rep login 200" 200 "$code"

echo "== account picker lists all 3 accounts =="
html=$(curl -s -b "$JAR" "$APP/seller")
contains "picker shows Meridian Robotics" "Meridian Robotics" "$html"
contains "picker shows Velora Health" "Velora Health" "$html"
contains "picker shows Stratos Cloud" "Stratos Cloud" "$html"

echo "== one-click create seeds the room =="
# createRoomAction is a server action POSTed to the page; use the API route that
# shares the same createOrGetRoom logic for a stable assertion.
room=$(curl -s -b "$JAR" -X POST "$APP/api/rooms" \
  -H 'Content-Type: application/json' -d '{"account_id":"acc_001"}')
nres=$(printf '%s' "$room" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["resources"]))')
slug=$(printf '%s' "$room" | python3 -c 'import sys,json;print(json.load(sys.stdin)["room"]["slug"])')
check "room seeded with 16 resources" 16 "$nres"

echo "== room builder renders modules A/B/C =="
page=$(curl -s -b "$JAR" "$APP/seller/rooms/$slug")
contains "Module A heading" "Account Snapshot" "$page"
contains "Module B heading" "Stakeholder Map" "$page"
contains "Module C heading" "Content Hub" "$page"
contains "Activity & Engagement panel" "Activity & Engagement" "$page"
contains "Champion highlighted" "Champion" "$page"
contains "CRM score labeled" "CRM score" "$page"
contains "Deal Overview panel (separate from engagement)" "Deal Overview" "$page"
contains "deal stage stepper" "Negotiation" "$page"
contains "Internal notes drawer toggle" "Internal notes" "$page"

echo "== widget grid renders the fixed layout (Deal → Activity → Content) =="
# Reorder is shelved; the layout is fixed: context pair (Snapshot/Stakeholders),
# then Deal Overview, Activity & Engagement, and Content Hub stacked below.
ord=$(python3 - "$page" <<'PY'
import sys
h = sys.argv[1]
idd, ia, ic = h.find("Deal Overview"), h.find("Activity &"), h.find("Content Hub")
print("OK" if 0 <= idd < ia < ic else "BAD")
PY
)
check "panels render in the fixed grid order (Deal < Activity < Content)" "OK" "$ord"

echo "== buyer is blocked from seller routes =="
curl -s -c "$JARB" -o /dev/null -X POST "$APP/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"p.sharma@velorahealth.com","password":"demo1234"}'
# Seller pages redirect non-reps to /forbidden.
loc=$(curl -s -b "$JARB" -o /dev/null -w "%{redirect_url}" "$APP/seller")
contains "buyer redirected away from /seller" "forbidden" "$loc"

echo
echo "RESULTS: pass=$pass fail=$fail"
rm -f "$JAR" "$JARB"
[ "$fail" -eq 0 ]
