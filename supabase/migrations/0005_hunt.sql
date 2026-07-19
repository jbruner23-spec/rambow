-- The hunt: watchlist writes + a secret setter for the eBay edge function.

-- token-guarded secret setter — used to hand eBay creds to the `hunt` edge
-- function via rmb_secrets without exposing them client-side.
create or replace function rmb_set_secret(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare stored text; tok text;
begin
  tok := nullif(payload->>'token', '');
  select value into stored from rmb_secrets where key = 'seed_token';
  if stored is null or stored is distinct from tok then
    raise exception 'invalid seed token';
  end if;
  insert into rmb_secrets(key, value) values (payload->>'key', payload->>'value')
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function rmb_set_secret(jsonb) to anon;

-- watchlist is single-user, no sensitive data — let the anon (publishable) key
-- manage watches directly. Tradeoff: any holder of the public key can edit/delete
-- watches; acceptable for a single-user app, gate behind app-password later.
drop policy if exists rmb_watches_anon_write on rmb_watches;
create policy rmb_watches_anon_write on rmb_watches for all to anon using (true) with check (true);

-- one watch per parallel per card set (enables upsert, blocks duplicate watches)
create unique index if not exists rmb_watches_uniq on rmb_watches(card_set_id, parallel_name);

-- the hunt edge function gates on the app's anon (publishable) key, stored here.
-- (public value; the row just lets the function compare without hardcoding.)
insert into rmb_secrets(key, value)
values ('anon_key', 'sb_publishable_oaPDlIsS0tHykMaYO8akfg_u1ow60RO')
on conflict (key) do update set value = excluded.value;
