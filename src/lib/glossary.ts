// Hobby-term glossary — rendered as tooltips via the <Term> component.
// One entry per term the UI shows; add here when a new term appears in the app.
export const GLOSSARY: Record<string, string> = {
  rainbow: 'Every color parallel of one card (same player, year, product, card #). Completing one is the point of this app.',
  parallel: 'A variant of a base card printed in a different color or pattern (Tie-Dye, Zebra, Gold), usually rarer than base.',
  serial: 'The copy number stamped on the card out of a fixed print run — 11/25 is copy 11 of 25 made.',
  'print run': 'Total copies made of a parallel. Lower run = rarer.',
  '1/1': 'A one-of-one — the only copy in existence. The grail tier of any rainbow.',
  sp: 'Short print — a parallel with a tiny print run (/25 or under), or known-scarce with no stamped number.',
  numbered: 'A serial-numbered parallel — stamped with its copy number out of a fixed print run.',
  unnumbered: 'A parallel with no stamped serial number; the print run is unpublished.',
  base: 'The standard version of the card — the anchor of the rainbow.',
  raw: 'An ungraded card, no case. Cheaper, but condition is your own judgment.',
  grade: 'A 1–10 condition score from a grading company (PSA, BGS, SGC), sealed in a labeled slab. Gem Mint 10 commands the premium.',
  'active chase': 'A rainbow past 50% completion — it gets missing-card images, dashboard placement, and alert eligibility.',
  checklist: 'The verified list of every parallel that exists for a card set. What your rainbow is measured against.',
  'your copy': 'An eBay listing photo showed this card’s exact serial number, so the image is likely your actual copy.',
  watch: 'A price alert on a missing parallel — the nightly scan pings your phone when one lists at or under your target.',
}
