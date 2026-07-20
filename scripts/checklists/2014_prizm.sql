-- 2014 Panini Prizm Football base-parallel checklist (Cardboard Connection).
-- Seeds Marshall Faulk #48. Owned parallel names already carry a "Prizm" suffix
-- in the spreadsheet, so the missing entries below match that convention (avoids
-- an rmb_norm phantom-duplicate against the owned rows).
-- Source: https://www.cardboardconnection.com/2014-panini-prizm-football-parallel-guide
select rmb_seed_checklist(
  (select id from rmb_card_sets where player='Marshall Faulk' and year=2014 and product='Prizm' and card_no='48'),
  '[
    {"name":"Blue Prizm","tier":"base","run":null},
    {"name":"Green Prizm","tier":"base","run":null},
    {"name":"Panini Red/Gold Prizm","tier":"short_print","run":null},
    {"name":"Team Logo Prizm","tier":"numbered","run":50},
    {"name":"Gold Prizm","tier":"short_print","run":10},
    {"name":"Black Finite Prizm","tier":"one_of_one","run":1}
  ]'::jsonb,
  'https://www.cardboardconnection.com/2014-panini-prizm-football-parallel-guide');
