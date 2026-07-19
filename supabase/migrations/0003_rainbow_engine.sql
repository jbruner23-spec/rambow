-- Rainbow completion engine.
-- Completion = distinct owned parallels (checklist rows with a linked owned card)
-- ÷ checklist size, per card set. Checklists are seeded per card set (see
-- scripts/checklists/) and gated by checklist_ready.

alter table rmb_card_sets add column if not exists checklist_ready boolean not null default false;

create or replace view rmb_rainbow_progress
with (security_invoker = true) as
select
  cs.id as card_set_id, cs.player, cs.year, cs.product, cs.card_no,
  cs.featured, cs.checklist_ready,
  (select count(*) from rmb_cards c where c.card_set_id = cs.id) as owned_cards,
  (select count(*) from rmb_parallels p where p.card_set_id = cs.id) as checklist_total,
  (select count(distinct p.id) from rmb_parallels p
     where p.card_set_id = cs.id
       and exists (select 1 from rmb_cards c where c.parallel_id = p.id)) as owned_parallels
from rmb_card_sets cs;

grant select on rmb_rainbow_progress to anon;
