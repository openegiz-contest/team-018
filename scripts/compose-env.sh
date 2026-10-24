#!/usr/bin/env bash
set -euo pipefail
# Forward to team-018-main if run from repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -d "${ROOT_DIR}/team-018-main" ]; then
  cd "${ROOT_DIR}/team-018-main"
  exec bash scripts/compose-env.sh "$@"
else
  exec bash scripts/compose-env.sh "$@"
fi
