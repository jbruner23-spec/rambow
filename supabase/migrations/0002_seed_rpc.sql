-- Seed / re-import RPC. SECURITY DEFINER so the anon-key loader can rebuild
-- inventory without a service-role secret. Accepts { token, players:[...], rows:[...] }.
--
-- Safe re-import (UC-02): card_sets are UPSERTED on their natural key so ids stay
-- stable and the checklist (rmb_parallels) / watches / alerts that reference them
-- survive. Only rmb_cards (regenerable from the spreadsheet) is refreshed.
--
-- Access control: trust-on-first-use seed token. The first caller's token is
-- stored in rmb_secrets (RLS-locked); later calls must match. Keeps a public
-- anon key from letting anyone reset the collection.

create or replace function rmb_seed_inventory(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n_players int; n_sets int; n_cards int; stored text; tok text;
begin
  tok := nullif(payload->>'token', '');
  select value into stored from rmb_secrets where key = 'seed_token';
  if stored is null then
    if tok is null then raise exception 'seed token required'; end if;
    insert into rmb_secrets(key, value) values ('seed_token', tok);
  elsif stored is distinct from tok then
    raise exception 'invalid seed token';
  end if;

  insert into rmb_players(name, featured, jersey_no, sort_order)
  select p->>'name', (p->>'featured')::bool, p->>'jersey_no', (p->>'sort_order')::int
  from jsonb_array_elements(payload->'players') p
  on conflict (name) do update set featured=excluded.featured,
    jersey_no=excluded.jersey_no, sort_order=excluded.sort_order;
  get diagnostics n_players = row_count;

  insert into rmb_card_sets(player, year, product, card_no, featured)
  select distinct r.player, r.year, r.product, r.card_no,
         r.player in ('Aaron Donald','Marshall Faulk')
  from jsonb_to_recordset(payload->'rows')
    as r(player text, year int, product text, card_no text, parallel text,
         graded text, serial int, qty int, price numeric, notes text)
  on conflict (player, year, product, card_no) do update set featured=excluded.featured;
  get diagnostics n_sets = row_count;

  delete from rmb_cards where id is not null;   -- WHERE required by safeupdate
  insert into rmb_cards
    (card_set_id, parallel_name, tier, serial_no, print_run, graded, purchase_price, notes)
  select cs.id, r.parallel,
    case when r.qty = 1 then 'one_of_one'
         when r.qty is not null and r.qty <= 25 then 'short_print'
         when r.qty is not null then 'numbered'
         when r.parallel is null then 'base'
         else 'unknown' end,
    r.serial, r.qty, r.graded, r.price, r.notes
  from jsonb_to_recordset(payload->'rows')
    as r(player text, year int, product text, card_no text, parallel text,
         graded text, serial int, qty int, price numeric, notes text)
  join rmb_card_sets cs on cs.player = r.player and cs.year = r.year
   and cs.product = r.product and cs.card_no = r.card_no;
  get diagnostics n_cards = row_count;

  return jsonb_build_object('players', n_players, 'card_sets', n_sets, 'cards', n_cards);
end $$;

grant execute on function rmb_seed_inventory(jsonb) to anon;
