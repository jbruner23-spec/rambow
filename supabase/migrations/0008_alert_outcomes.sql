-- Let the app mark alert outcomes (bought / passed / junk). Single-user tradeoff,
-- same as rmb_watches writes — but scoped to the one column the UI needs.
-- Inserts still go through the token-guarded RPC.
drop policy if exists rmb_alerts_anon_update on rmb_alerts;
create policy rmb_alerts_anon_update on rmb_alerts for update to anon using (true) with check (true);
revoke update on rmb_alerts from anon;
grant update (outcome) on rmb_alerts to anon;
