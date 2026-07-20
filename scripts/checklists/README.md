# Master checklists

Each file seeds the parallel checklist for one or more card sets, then links owned
cards and marks the set `checklist_ready`. Completion % is then computed by the
`rmb_rainbow_progress` view.

## Seeding a card set (the pattern)

1. **Owned → checklist.** Insert every distinct owned `parallel_name` as a
   `verified` parallel (it exists because you own it).
2. **Missing → checklist.** Insert researched parallels you don't own, `on conflict
   (card_set_id, name) do nothing`.
3. **Link.** `update rmb_cards.parallel_id` = matching `rmb_parallels.id` by exact name.
4. **Ready.** `update rmb_card_sets set checklist_ready = true`.

## ⚠️ Exact-name requirement

Steps 2–3 match on the **exact** parallel name string. A researched name that is a
spelling variant of an owned parallel (e.g. `Black Prizm` vs an owned `Black Prizm
1/1`) will NOT conflict, producing a duplicate row: the card stays linked to the
owned-name row while the variant shows as a phantom "missing" tile, inflating the
denominator. Before adding a set, query its distinct owned `parallel_name`s and make
the researched names match verbatim for any parallel you actually own. After seeding,
confirm `owned_parallels` in `rmb_rainbow_progress` equals the distinct owned parallel
count, and that no owned card is left with `parallel_id is null` (the rainbow page
surfaces those in an "Owned · not yet on the checklist" strip).

## Reusable seeder

`rmb_seed_checklist(set_id, base_jsonb, source, status)` (migration 0007) does the
whole pattern with **name-normalized matching** (`rmb_norm` strips "Prizm"/"1/1"), so
"Blue Ice Prizm" / "Black Prizm 1/1" match the checklist's "Blue Ice" / "Black" and
aren't double-counted as missing. After seeding, `owned_parallels` must equal the
distinct owned count and `parallel_id is null` must be 0 for that set.

## Seeded rainbows

| Rainbow | Completion | Source |
|---|---|---|
| Cooper Kupp 2022 Select #8 | 21/25 | 2021 Select Concourse (proxy, `estimated`) |
| Aaron Donald 2021 Select #120 | 22/27 | 2021 Select Premier (`verified`) |
| Aaron Donald 2020 Select #133 | 17/22 | 2021 Select Premier (proxy, `estimated`) |
| Aaron Donald 2019 Select #44 | 12/17 | 2021 Select Concourse (proxy, `estimated`) |
| Matthew Stafford 2021 Select #20 | 10/20 | 2021 Select Concourse (`verified`) |
| Aaron Donald 2022 Prizm #164 | 14/37 | 2022 Prizm (`verified`) |
| Aaron Donald 2021 Prizm #69 | 14/39 | 2021 Prizm (`verified`) |
| Matthew Stafford 2022 Prizm #159 | 11/37 | 2022 Prizm (`verified`) |
| Aaron Donald 2023 Prizm #162 | 14/49 | 2023 Prizm (`verified`) |
| Marshall Faulk 2022 Prizm #167 | 26/41 | 2022 Prizm (`verified`) |
| Marshall Faulk 2021 Select #39 | 24/29 | 2021 Select Concourse (`verified`) |
| Aaron Donald 2024 Prizm #172 | 10/51 | 2024 Prizm (`verified`) |
| AD #243 · Kupp #158 · Stafford #241 · AD #497 · Kupp #496 · Stafford #381 · Kupp #382 (all 2022 Select) | 41%→21% | 2022 Select tiers (`estimated`) |
| Aaron Donald 2019 Select #240 | 6/11 | 2021 Select Field (proxy, `estimated`) |
| Aaron Donald 2023 Select #113 | 8/18 | 2021 Select Premier (proxy, `estimated`) |
| Aaron Donald 2016 Select #16 | 5/13 | 2021 Select Concourse (proxy, `estimated`) |
| Marshall Faulk 2016 Select #174 · 2017 #130; Aaron Donald 2018 #111 | 4–7/14–17 | 2021 Select Premier (proxy, `estimated`) |
| Marshall Faulk 2014 Prizm #48 | 13/19 | 2014 Prizm base (Cardboard Connection, `verified`) |

**26 rainbows tracked** (verified across all: 0 owned cards mis-flagged as missing).
Prizm base lists are exact per year (Cardboard Connection); Select proxy tiers reuse
the 2021 structure and are marked `estimated`. Missing exotic parallels you don't own
may still be absent, so a % can ease as the checklist grows.

## Checklist confidence

Checklists currently cover base-Prizm parallels + everything owned; exotic parallels
(Disco/Die-Cut/etc.) you don't own may still be missing, so the headline % is
optimistic until the checklist is expanded and parallels flip to `status='verified'`.
