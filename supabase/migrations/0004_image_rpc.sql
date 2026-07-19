-- Apply sourced images to owned cards + checklist parallels. Token-guarded so the
-- anon-key image job (scripts/source_images.py) can write.
-- payload = { token, cards:[{id,url,source,likely}], parallels:[{id,url}] }

create or replace function rmb_apply_images(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare stored text; tok text; nc int := 0; np int := 0;
begin
  tok := nullif(payload->>'token', '');
  select value into stored from rmb_secrets where key = 'seed_token';
  if stored is null or stored is distinct from tok then
    raise exception 'invalid seed token';
  end if;

  with c as (
    select (x->>'id')::bigint id, x->>'url' url, x->>'source' source,
           coalesce((x->>'likely')::bool, false) likely
    from jsonb_array_elements(coalesce(payload->'cards', '[]'::jsonb)) x
  )
  update rmb_cards t
     set image_url = c.url, image_source = c.source, likely_your_copy = c.likely
    from c where t.id = c.id;
  get diagnostics nc = row_count;

  with p as (
    select (x->>'id')::bigint id, x->>'url' url
    from jsonb_array_elements(coalesce(payload->'parallels', '[]'::jsonb)) x
  )
  update rmb_parallels t set image_url = p.url, thumbnail = p.url
    from p where t.id = p.id;
  get diagnostics np = row_count;

  return jsonb_build_object('cards', nc, 'parallels', np);
end $$;

grant execute on function rmb_apply_images(jsonb) to anon;
