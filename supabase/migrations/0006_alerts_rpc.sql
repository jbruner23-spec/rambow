-- Nightly watch-scan alerts. rmb_apply_alerts writes matches found by
-- scripts/scan_watches.py (anon key + seed token). Deduped per listing per watch.

create unique index if not exists rmb_alerts_uniq on rmb_alerts(watch_id, listing_id);

create or replace function rmb_apply_alerts(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare stored text; tok text; n int := 0;
begin
  tok := nullif(payload->>'token', '');
  select value into stored from rmb_secrets where key = 'seed_token';
  if stored is null or stored is distinct from tok then
    raise exception 'invalid seed token';
  end if;

  insert into rmb_alerts(watch_id, marketplace, listing_id, title, price, url, thumbnail, outcome)
  select (a->>'watch_id')::bigint, coalesce(a->>'marketplace', 'ebay'), a->>'listing_id',
         a->>'title', (a->>'price')::numeric, a->>'url', a->>'thumbnail', 'new'
  from jsonb_array_elements(coalesce(payload->'alerts', '[]'::jsonb)) a
  on conflict (watch_id, listing_id) do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('inserted', n);
end $$;
grant execute on function rmb_apply_alerts(jsonb) to anon;
