// Live eBay listings proxy for the hunt panel. Reads eBay creds from rmb_secrets
// (service role, server-side only), gets an OAuth token, and returns price-sorted
// Browse results. Deployed to Supabase Edge Functions as `hunt` (verify_jwt=false;
// read-only proxy, no user data).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cached: { t: string; exp: number } | null = null;

async function ebayToken(app: string, cert: string): Promise<string> {
  if (cached && cached.exp > Date.now() + 30000) return cached.t;
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${app}:${cert}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("ebay auth failed");
  cached = { t: j.access_token, exp: Date.now() + (j.expires_in ?? 7200) * 1000 };
  return j.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // gate: require the app's anon key (blocks anonymous quota-burning of the eBay proxy)
    const { data: sk } = await admin.from("rmb_secrets").select("value").eq("key", "anon_key").maybeSingle();
    const supplied = req.headers.get("apikey") ?? (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (sk?.value && supplied !== sk.value) return json({ error: "unauthorized" }, 401);

    const { q, limit } = await req.json();
    if (!q || typeof q !== "string") return json({ error: "q required" }, 400);
    const { data, error: sErr } = await admin.from("rmb_secrets").select("key,value").in("key", ["ebay_app_id", "ebay_cert_id"]);
    if (sErr) return json({ error: "secret store unavailable" }, 500);
    const m: Record<string, string> = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    if (!m.ebay_app_id || !m.ebay_cert_id) return json({ error: "ebay creds not configured" }, 500);
    const tok = await ebayToken(m.ebay_app_id, m.ebay_cert_id);
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", String(Math.min(Math.max(Number(limit) || 20, 1), 50)));
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } });
    if (!r.ok) return json({ error: `ebay ${r.status}` }, 502);
    const j = await r.json();
    const items = (j.itemSummaries ?? [])
      .map((it: Record<string, any>) => ({
        id: it.itemId,
        title: it.title,
        price: Number(it.price?.value) || null,
        currency: it.price?.currency ?? "USD",
        url: it.itemWebUrl,
        image: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl ?? null,
        condition: it.condition ?? null,
        auction: (it.buyingOptions ?? []).includes("AUCTION"),
      }))
      .sort((a: { price: number | null }, b: { price: number | null }) => (a.price ?? 1e9) - (b.price ?? 1e9));
    return json({ items });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
