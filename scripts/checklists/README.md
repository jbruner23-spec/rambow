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

## Checklist confidence

Checklists currently cover base-Prizm parallels + everything owned; exotic parallels
(Disco/Die-Cut/etc.) you don't own may still be missing, so the headline % is
optimistic until the checklist is expanded and parallels flip to `status='verified'`.
