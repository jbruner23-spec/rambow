-- User-shot card photos: a public Storage bucket + scoped anon writes, and a
-- re-import that preserves uploads (they'd otherwise be wiped when rmb_cards is
-- rebuilt from the spreadsheet).

insert into storage.buckets (id, name, public) values ('rmb-cards', 'rmb-cards', true)
on conflict (id) do nothing;

-- anon may upload/replace objects in this bucket (single-user app); reads are public
drop policy if exists rmb_cards_obj_insert on storage.objects;
create policy rmb_cards_obj_insert on storage.objects for insert to anon
  with check (bucket_id = 'rmb-cards');
drop policy if exists rmb_cards_obj_update on storage.objects;
create policy rmb_cards_obj_update on storage.objects for update to anon
  using (bucket_id = 'rmb-cards') with check (bucket_id = 'rmb-cards');

-- anon may set a card's image, scoped to the image columns only (revoke the
-- broad table grant first, else the column grant is merely additive)
drop policy if exists rmb_cards_anon_photo on rmb_cards;
create policy rmb_cards_anon_photo on rmb_cards for update to anon using (true) with check (true);
revoke update on rmb_cards from anon;
grant update (image_url, image_source) on rmb_cards to anon;

-- re-import preserves uploads: snapshot upload-sourced images by natural key,
-- rebuild cards, re-apply. Redefines rmb_seed_inventory (supersedes 0002).
create or replace function rmb_seed_inventory(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n_players int; n_sets int; n_cards int; stored text; tok text;
begin
  tok := nullif(payload->>'token', '');
  select value into stored from rmb_secrets where key = 'seed_token';
  if stored is null or stored is distinct from tok then
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

  create temp table _up on commit drop as
  select cs.player, cs.year, cs.product, cs.card_no, c.parallel_name, c.serial_no, c.image_url
  from rmb_cards c join rmb_card_sets cs on cs.id = c.card_set_id
  where c.image_source = 'upload' and c.image_url is not null;

  delete from rmb_cards where id is not null;
  insert into rmb_cards
    (card_set_id, parallel_name, tier, serial_no, print_run, graded, purchase_price, notes)
  select cs.id, r.parallel,
    case when r.qty = 1 then 'one_of_one'
         when r.qty is not null and r.qty <= 25 then 'short_print'
         when r.qty is not null then 'numbered'
         when r.parallel is null then 'base' else 'unknown' end,
    r.serial, r.qty, r.graded, r.price, r.notes
  from jsonb_to_recordset(payload->'rows')
    as r(player text, year int, product text, card_no text, parallel text,
         graded text, serial int, qty int, price numeric, notes text)
  join rmb_card_sets cs on cs.player = r.player and cs.year = r.year
   and cs.product = r.product and cs.card_no = r.card_no;
  get diagnostics n_cards = row_count;

  update rmb_cards c set image_url = u.image_url, image_source = 'upload'
  from _up u join rmb_card_sets cs on cs.player=u.player and cs.year=u.year
    and cs.product=u.product and cs.card_no=u.card_no
  where c.card_set_id = cs.id
    and c.parallel_name is not distinct from u.parallel_name
    and c.serial_no is not distinct from u.serial_no;

  return jsonb_build_object('players', n_players, 'card_sets', n_sets, 'cards', n_cards);
end $$;
