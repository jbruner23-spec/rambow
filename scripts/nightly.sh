#!/usr/bin/env bash
# Rambow nightly job (run by the com.rambow.nightly LaunchAgent).
# Every night: scan active watches -> ntfy alerts for cards under target.
# Sundays: also refresh card images (fills in obscure parallels over time).
set -euo pipefail
eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || true

cd "$HOME/rambow"
set -a
. "$HOME/rambow/.env"
. "$HOME/morning-report/.env"   # EBAY_APP_ID / EBAY_CERT_ID
set +a

LOG="$HOME/rambow/scripts/.nightly.log"
echo "=== $(date '+%Y-%m-%d %H:%M') nightly ===" >> "$LOG"
# || true so a scan failure (e.g. eBay rate-limit) doesn't skip the weekly image step
uv run --with requests python scripts/scan_watches.py >> "$LOG" 2>&1 || echo "scan failed" >> "$LOG"

# weekly image refresh (Sunday = 0)
if [ "$(date +%w)" = "0" ]; then
  echo "-- weekly image refresh --" >> "$LOG"
  uv run --with requests --with openpyxl python scripts/source_images.py --all >> "$LOG" 2>&1
fi
