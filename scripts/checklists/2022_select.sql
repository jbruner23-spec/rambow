-- 2022 Panini Select Football. Five tiers by card #: Concourse 1-100, Premier
-- 101-200, Club 201-300, Field 301-400, Suite 401-500. Per-tier print runs vary,
-- so this common base+disco list is marked 'estimated'. #8 (Concourse) was seeded
-- earlier via the 2021 proxy. Source: cardboardconnection.com/2022-panini-select-football-nfl-cards
with b as (select '[
  {"name":"Silver","tier":"base","run":null},{"name":"Tiger","tier":"unknown","run":null},
  {"name":"Zebra","tier":"short_print","run":null},{"name":"Cosmic","tier":"unknown","run":null},
  {"name":"Tri-Color","tier":"numbered","run":249},{"name":"Blue","tier":"numbered","run":199},
  {"name":"Maroon","tier":"numbered","run":149},{"name":"Red","tier":"numbered","run":99},
  {"name":"Dragon Scale","tier":"numbered","run":89},{"name":"Purple","tier":"numbered","run":75},
  {"name":"Orange","tier":"numbered","run":49},{"name":"Red Disco","tier":"numbered","run":49},
  {"name":"White","tier":"numbered","run":35},{"name":"Blue Disco","tier":"short_print","run":25},
  {"name":"Tie-Dye","tier":"short_print","run":25},{"name":"Gold","tier":"short_print","run":10},
  {"name":"Gold Disco","tier":"short_print","run":10},{"name":"Pink","tier":"short_print","run":10},
  {"name":"Neon Orange Pulsar","tier":"short_print","run":7},{"name":"Green","tier":"short_print","run":5},
  {"name":"Green Disco","tier":"short_print","run":5},{"name":"Green and Black Snakeskin","tier":"short_print","run":2},
  {"name":"Black","tier":"one_of_one","run":1},{"name":"Black Disco","tier":"one_of_one","run":1}
]'::jsonb j)
select rmb_seed_checklist(cs.id, b.j,
         'https://www.cardboardconnection.com/2022-panini-select-football-nfl-cards', 'estimated')
from b, rmb_card_sets cs
where cs.year=2022 and cs.product='Select'
  and (cs.player, cs.card_no) in
    (('Aaron Donald','243'), ('Cooper Kupp','158'), ('Matthew Stafford','241'),
     ('Aaron Donald','497'), ('Cooper Kupp','496'), ('Matthew Stafford','381'), ('Cooper Kupp','382'));

-- Older Select tiers reuse the verified 2021 tier lists from 2021_select.sql as a
-- proxy (structure is consistent year-to-year), status 'estimated':
--   Concourse -> 2016 #16
--   Premier   -> 2023 #113, 2016 #174, 2017 #130, 2018 #111
--   Field     -> 2019 #240
