-- Reusable checklist seeder with name-normalized matching.
-- The spreadsheet inconsistently suffixes "Prizm" and appends "1/1"; normalizing
-- both sides prevents an owned parallel from being double-counted as "missing".

create or replace function rmb_norm(s text) returns text language sql immutable as $$
  select trim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(s,'')), '\yprizm\y', '', 'g'),
             '1\s*/\s*1|1 of 1', '', 'g'),
           '\s+', ' ', 'g'))
$$;

-- Seed a card set's checklist: sync owned parallels (always 'verified' — you own
-- them), add researched base parallels whose NORMALIZED name isn't already owned,
-- link owned cards, mark the set ready. p_status marks the researched rows
-- ('verified' for exact-year data, 'estimated' for proxy tiers).
create or replace function rmb_seed_checklist(p_set_id bigint, p_base jsonb, p_source text,
                                              p_status text default 'verified')
returns jsonb language plpgsql security definer set search_path = public as $$
declare n_base int;
begin
  insert into rmb_parallels(card_set_id, name, tier, print_run, status)
  select distinct on (c.parallel_name) c.card_set_id, c.parallel_name, c.tier, c.print_run, 'verified'
  from rmb_cards c where c.card_set_id = p_set_id and c.parallel_name is not null
  order by c.parallel_name, c.print_run nulls last
  on conflict (card_set_id, name) do nothing;

  insert into rmb_parallels(card_set_id, name, tier, print_run, source_url, status)
  select p_set_id, b->>'name', b->>'tier', (b->>'run')::int, p_source, p_status
  from jsonb_array_elements(p_base) b
  where not exists (
    select 1 from rmb_parallels x
    where x.card_set_id = p_set_id and rmb_norm(x.name) = rmb_norm(b->>'name')
  );
  get diagnostics n_base = row_count;

  update rmb_cards c set parallel_id = pp.id from rmb_parallels pp
  where pp.card_set_id = c.card_set_id and pp.name = c.parallel_name and c.card_set_id = p_set_id;
  update rmb_card_sets set checklist_ready = true where id = p_set_id;

  return jsonb_build_object('base_added', n_base);
end $$;
