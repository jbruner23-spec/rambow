-- Replacing an existing card photo failed with "new row violates row-level
-- security policy". The app uploads to a fixed path (card-{id}.jpg) with
-- upsert:true, and Supabase's upsert must first SELECT the existing object to
-- know it's an update rather than an insert. 0009 granted anon INSERT + UPDATE
-- on storage.objects but no SELECT, so the first upload for a card succeeded
-- and every replace failed.
--
-- Scoped to bucket_id = 'rmb-cards' — this is a shared project, so anon must
-- not be able to enumerate objects in any other bucket.

drop policy if exists rmb_cards_obj_select on storage.objects;
create policy rmb_cards_obj_select on storage.objects for select to anon
  using (bucket_id = 'rmb-cards');
