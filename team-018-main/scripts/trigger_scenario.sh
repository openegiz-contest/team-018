#!/usr/bin/env bash
#
# Smart-Kenish What-If trigger with confirmation in Eclipse Ditto.
# Usage: bash scripts/trigger_scenario.sh <trolley-fault|crusher-fault|water-influx> <gen1|gen2|revert>
# Exit:  0 = new state confirmed in Ditto, 1 = Ditto did not reach it in 30 s,
#        2 = usage error, stack not running, or broker unreachable.
#
set -euo pipefail

usage() { echo "usage: $0 <trolley-fault|crusher-fault|water-influx> <gen1|gen2|revert>" >&2; exit 2; }
[ "$#" -eq 2 ] || usage
SCENARIO="$1"
MODE="$2"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/deploy/compose/.env"
[ -f "$ENV_FILE" ] || { echo "✗ $ENV_FILE not found: run 'make team-mine' first" >&2; exit 2; }
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

DITTO_URL="http://127.0.0.1:${DITTO_PORT:-8080}"
AUTH="ditto:${DITTO_PASSWORD:?DITTO_PASSWORD missing in .env}"

case "$SCENARIO" in
  trolley-fault) THING="org.openegiz.mine:trolley-line-01" ;;
  crusher-fault) THING="org.openegiz.mine:crusher-01" ;;
  water-influx)  THING="org.openegiz.mine:pump-station-01" ;;
  *) echo "✗ unknown scenario: $SCENARIO" >&2; usage ;;
esac
case "$MODE" in
  gen1)   EXPECTED="GEN1" ;;
  gen2)   EXPECTED="GEN2" ;;
  revert) EXPECTED="NORMAL" ;;
  *) echo "✗ unknown mode: $MODE" >&2; usage ;;
esac

curl -sf --max-time 5 -u "$AUTH" "$DITTO_URL/api/2/things/$THING" >/dev/null \
  || { echo "✗ Ditto unreachable or twin $THING missing at $DITTO_URL" >&2; exit 2; }

export MQTT_HOST=127.0.0.1 MQTT_PORT="${MQTT_PORT:-1883}"
if [ "$MODE" = "revert" ]; then
  python3 "$ROOT/team/scenarios.py" revert "$SCENARIO" || exit 2
else
  python3 "$ROOT/team/scenarios.py" trigger "$SCENARIO" --mode "$MODE" || exit 2
fi

URL="$DITTO_URL/api/2/things/$THING/features/contingency_status/properties/value"
CURRENT=""
for _ in $(seq 1 30); do
  CURRENT="$(curl -sf --max-time 3 -u "$AUTH" "$URL" | tr -d '"' || true)"
  [ "$CURRENT" = "$EXPECTED" ] && break
  sleep 1
done

if [ "$CURRENT" = "$EXPECTED" ]; then
  MINE="$DITTO_URL/api/2/things/org.openegiz.mine:mine-01/features"
  LEVEL="$(curl -sf --max-time 3 -u "$AUTH" "$MINE/emergency_level/properties/value" | tr -d '"' || true)"
  RISK="$(curl -sf --max-time 3 -u "$AUTH" "$MINE/hourly_risk_exposure_usd/properties/value" || true)"
  echo "✓ Ditto: $THING contingency_status=$CURRENT | mine-01 emergency_level=${LEVEL:-?} | risk=\$${RISK:-?}/h"
  exit 0
fi
echo "✗ Ditto did not reach '$EXPECTED' within 30 s (current: '${CURRENT:-?}')" >&2
exit 1
