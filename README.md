# Rambow

Personal card-collection app for completing rainbows — every color parallel of a
card. Knows what you own, knows every parallel that exists, shows the gap, and
hunts the marketplaces for the missing pieces. Seeded from `MyFootballCards.xlsx`,
styled after the LA Rams. Featured chases: Aaron Donald #99, Marshall Faulk #28.

See the [plan](https://jbruner23-spec.github.io/rambow-plan/) for the full spec.
**Live:** https://goldfish-app-pghpk.ondigitalocean.app

## Stack

- **Frontend:** React + Vite + TypeScript, mobile-first, Rams theme. Deployed as a
  free DigitalOcean App Platform static site (auto-deploys on push to `main`; spec
  in `.do/app.yaml`).
- **Data:** Supabase (Postgres). Tables are `rmb_`-prefixed and live in the shared
  `herringbone-market-intel` project (`yibuqsvcxugpkxogwspn`) to avoid a new-project
  charge; portable to a standalone project later.
- **Live search:** the `hunt` Supabase Edge Function proxies eBay Browse (creds held
  server-side in `rmb_secrets`, gated on the app's anon key).
- **Jobs:** a nightly LaunchAgent (`com.rambow.nightly`) scans watches → ntfy alerts,
  and refreshes card images weekly.

## Setup

```bash
npm install
cp .env.example .env      # fill in Supabase URL + anon (publishable) key
npm run dev
```

`.env` (gitignored) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the
publishable key is read-only via RLS and safe in the browser).

## Data model

Six tables: `rmb_players`, `rmb_card_sets` (player+year+product+card#, the unit a
rainbow is measured on), `rmb_parallels` (master checklist), `rmb_cards` (owned
inventory), `rmb_watches`, `rmb_alerts`. Schema is versioned in
`supabase/migrations/`.

## Seed / re-import inventory

Parses the Rams + Faulk sheets and rebuilds `rmb_players` / `rmb_card_sets` /
`rmb_cards` via the `rmb_seed_inventory` RPC (idempotent — safe to re-run when the
spreadsheet changes; UC-01 / UC-02):

```bash
set -a; . ./.env; set +a
uv run --with requests --with openpyxl python scripts/import_inventory.py
# -> seeded: {'players': 9, 'card_sets': 207, 'cards': 593}
```

## Card images (eBay)

Sources card + missing-parallel images from eBay Browse and writes them via the
`rmb_apply_images` RPC. `--all` does the whole collection (obscure parallels fill
in over repeat runs):

```bash
set -a; . ./.env; . ~/morning-report/.env; set +a   # eBay keys from the morning report
uv run --with requests python scripts/source_images.py [--all]
```

## Nightly automation

`scripts/nightly.sh` (run by the `com.rambow.nightly` LaunchAgent at 7:15am) scans
every active watch on eBay and pushes an ntfy alert for listings at/under target,
deduped so a listing pings once; on Sundays it also refreshes images.

```bash
# install / reload the scheduler
cp scripts/com.rambow.nightly.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.rambow.nightly.plist
# run the scan by hand:
set -a; . ./.env; . ~/morning-report/.env; set +a
uv run --with requests python scripts/scan_watches.py
# disable:
launchctl unload ~/Library/LaunchAgents/com.rambow.nightly.plist
```

Env beyond the frontend keys (all in `.env` / sourced): `RMB_SEED_TOKEN` (guards the
write RPCs), `RMB_NTFY_TOPIC`, and `EBAY_APP_ID` / `EBAY_CERT_ID`.
