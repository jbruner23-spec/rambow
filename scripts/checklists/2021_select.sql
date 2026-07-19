-- 2021 Panini Select Football checklists (Cardboard Connection base-Prizm structure).
-- Tiers: Concourse #1-100, Premier Level #101-200, Field Level #301-400 differ.
-- Seeds AD #120 (Premier) and Stafford #20 (Concourse). Idempotent.
-- Source: https://www.cardboardconnection.com/2021-panini-select-football-nfl-cards

-- ===== Aaron Donald · 2021 Select #120 (Premier Level) =====
insert into rmb_parallels (card_set_id, name, tier, print_run, status)
select distinct on (c.parallel_name) c.card_set_id, c.parallel_name, c.tier, c.print_run, 'verified'
from rmb_cards c
where c.card_set_id = (select id from rmb_card_sets
       where player='Aaron Donald' and year=2021 and product='Select' and card_no='120')
  and c.parallel_name is not null
order by c.parallel_name, c.print_run nulls last
on conflict (card_set_id, name) do nothing;

insert into rmb_parallels (card_set_id, name, tier, print_run, source_url, status)
select (select id from rmb_card_sets where player='Aaron Donald' and year=2021 and product='Select' and card_no='120'),
       v.name, v.tier, v.print_run,
       'https://www.cardboardconnection.com/2021-panini-select-football-nfl-cards', 'verified'
from (values
  ('Silver Prizm','base',null::int),
  ('Zebra Prizm','short_print',null),
  ('White Prizm','numbered',35),
  ('Purple Prizm','numbered',75),
  ('Green and Black Snakeskin Prizm','short_print',2)
) as v(name,tier,print_run)
on conflict (card_set_id, name) do nothing;

-- ===== Matthew Stafford · 2021 Select #20 (Concourse) =====
insert into rmb_parallels (card_set_id, name, tier, print_run, status)
select distinct on (c.parallel_name) c.card_set_id, c.parallel_name, c.tier, c.print_run, 'verified'
from rmb_cards c
where c.card_set_id = (select id from rmb_card_sets
       where player='Matthew Stafford' and year=2021 and product='Select' and card_no='20')
  and c.parallel_name is not null
order by c.parallel_name, c.print_run nulls last
on conflict (card_set_id, name) do nothing;

insert into rmb_parallels (card_set_id, name, tier, print_run, source_url, status)
select (select id from rmb_card_sets where player='Matthew Stafford' and year=2021 and product='Select' and card_no='20'),
       v.name, v.tier, v.print_run,
       'https://www.cardboardconnection.com/2021-panini-select-football-nfl-cards', 'verified'
from (values
  ('Silver Prizm','base',null::int),
  ('Tri-Color Prizm','numbered',249),
  ('Maroon Prizm','numbered',149),
  ('Red Prizm','numbered',99),
  ('Purple Prizm','numbered',75),
  ('White Prizm','numbered',35),
  ('Green Prizm','short_print',5),
  ('Green and Black Snakeskin Prizm','short_print',2),
  ('Black Prizm','one_of_one',1),
  ('Zebra Prizm','short_print',null)
) as v(name,tier,print_run)
on conflict (card_set_id, name) do nothing;

-- ===== link owned cards + mark ready (both sets) =====
update rmb_cards c set parallel_id = p.id
from rmb_parallels p
where p.card_set_id = c.card_set_id and p.name = c.parallel_name
  and c.card_set_id in (
    select id from rmb_card_sets where
      (player='Aaron Donald' and year=2021 and product='Select' and card_no='120') or
      (player='Matthew Stafford' and year=2021 and product='Select' and card_no='20'));

update rmb_card_sets set checklist_ready = true where
  (player='Aaron Donald' and year=2021 and product='Select' and card_no='120') or
  (player='Matthew Stafford' and year=2021 and product='Select' and card_no='20');
