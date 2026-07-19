# Rambow

Personal card-collection app for completing rainbows — every color parallel of a
card. Knows what you own, knows every parallel that exists, shows the gap, and
hunts the marketplaces for the missing pieces. Seeded from `MyFootballCards.xlsx`,
styled after the LA Rams. Featured chases: Aaron Donald #99, Marshall Faulk #28.

See the [plan](https://jbruner23-spec.github.io/rambow-plan/) for the full spec.

## Stack

- **Frontend:** React + Vite + TypeScript, mobile-first, Rams theme.
- **Data:** Supabase (Postgres + Storage). Tables are `rmb_`-prefixed and live in
  the shared `herringbone-market-intel` project (`yibuqsvcxugpkxogwspn`) to avoid a
  new-project charge; portable to a standalone project later.
- **Jobs:** eBay Browse + marketplace scans, image sourcing, ntfy alerts (later increments).

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

`scripts/import_gen.py` is an offline alternative that emits raw SQL to
`scripts/seed_parts/` (not needed for normal seeding).
