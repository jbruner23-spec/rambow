-- 2024 Panini Prizm Football base-parallel checklist (Cardboard Connection).
-- Seeds Aaron Donald #172. Uses the reusable rmb_seed_checklist(set_id, base, source, status).
-- Source: https://www.cardboardconnection.com/2024-panini-prizm-football-nfl-cards
select rmb_seed_checklist(
  (select id from rmb_card_sets where player='Aaron Donald' and year=2024 and product='Prizm' and card_no='172'),
  '[
    {"name":"Silver","tier":"base","run":null},{"name":"Blue","tier":"unknown","run":null},
    {"name":"Green","tier":"unknown","run":null},{"name":"Green Ice","tier":"unknown","run":null},
    {"name":"Green Wave","tier":"unknown","run":null},{"name":"Orange Ice","tier":"unknown","run":null},
    {"name":"Red","tier":"unknown","run":null},{"name":"Red Sparkle","tier":"unknown","run":null},
    {"name":"Red/White/Blue","tier":"unknown","run":null},{"name":"Snakeskin","tier":"unknown","run":null},
    {"name":"White Sparkle","tier":"short_print","run":null},{"name":"Disco","tier":"unknown","run":null},
    {"name":"Lazer","tier":"unknown","run":null},{"name":"Neon Green Pulsar","tier":"unknown","run":null},
    {"name":"Pink","tier":"unknown","run":null},{"name":"Pink Wave","tier":"unknown","run":null},
    {"name":"Press Proof","tier":"unknown","run":null},{"name":"Purple Pulsar","tier":"unknown","run":null},
    {"name":"Black & Red Checker","tier":"unknown","run":null},{"name":"Black & White Checker","tier":"unknown","run":null},
    {"name":"Pandora","tier":"numbered","run":400},{"name":"Orange","tier":"numbered","run":249},
    {"name":"Blue Wave","tier":"numbered","run":230},{"name":"Purple Ice","tier":"numbered","run":225},
    {"name":"Hyper","tier":"numbered","run":180},{"name":"Red Wave","tier":"numbered","run":149},
    {"name":"Purple","tier":"numbered","run":125},{"name":"Blue Ice","tier":"numbered","run":99},
    {"name":"Blue Sparkle","tier":"numbered","run":96},{"name":"Green Scope","tier":"numbered","run":75},
    {"name":"Orange Wave","tier":"numbered","run":60},{"name":"Red and Yellow","tier":"numbered","run":44},
    {"name":"Red Shimmer","tier":"numbered","run":35},{"name":"White","tier":"numbered","run":35},
    {"name":"Navy Camo","tier":"short_print","run":25},{"name":"Blue Shimmer","tier":"short_print","run":25},
    {"name":"Gold Sparkle","tier":"short_print","run":24},{"name":"Forest Camo","tier":"short_print","run":15},
    {"name":"Gold","tier":"short_print","run":10},{"name":"Gold Wave","tier":"short_print","run":10},
    {"name":"Green Sparkle","tier":"short_print","run":8},{"name":"Green Shimmer","tier":"short_print","run":5},
    {"name":"Gold Vinyl","tier":"short_print","run":5},{"name":"White Knight","tier":"short_print","run":3},
    {"name":"Black Finite","tier":"one_of_one","run":1},{"name":"Black Shimmer","tier":"one_of_one","run":1},
    {"name":"Stars","tier":"one_of_one","run":1}
  ]'::jsonb,
  'https://www.cardboardconnection.com/2024-panini-prizm-football-nfl-cards');
