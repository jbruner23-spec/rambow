#!/usr/bin/env python3
"""Source card images from eBay for owned cards + missing checklist parallels.

Owned cards get the first matching listing's image, flagged likely_your_copy when
a listing title shows the exact serial (e.g. 11/25). Missing parallels get a
representative reference image. Writes via the rmb_apply_images RPC (anon key +
seed token). By default only processes checklist-ready sets; pass --all for every set.

Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, RMB_SEED_TOKEN (rambow/.env)
     EBAY_APP_ID, EBAY_CERT_ID (morning-report/.env — the JBCardSearch keyset)

Run: set -a; . ~/rambow/.env; . ~/morning-report/.env; set +a
     uv run --with requests python scripts/source_images.py [--all]
"""
import base64
import os
import re
import sys
import time
import requests

URL = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
TOKEN = os.environ.get("RMB_SEED_TOKEN", "")
EBAY_APP, EBAY_CERT = os.environ.get("EBAY_APP_ID"), os.environ.get("EBAY_CERT_ID")
if not all([URL, KEY, TOKEN, EBAY_APP, EBAY_CERT]):
    sys.exit("missing env — source ~/rambow/.env and ~/morning-report/.env")

REST = f"{URL}/rest/v1"
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
BROWSE = "https://api.ebay.com/buy/browse/v1/item_summary/search"
ALL = "--all" in sys.argv


def ebay_token():
    auth = base64.b64encode(f"{EBAY_APP}:{EBAY_CERT}".encode()).decode()
    r = requests.post("https://api.ebay.com/identity/v1/oauth2/token",
                      headers={"Authorization": f"Basic {auth}",
                               "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "client_credentials",
                            "scope": "https://api.ebay.com/oauth/api_scope"}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def search(tok, q, limit=10):
    r = requests.get(BROWSE, params={"q": q, "limit": limit},
                     headers={"Authorization": f"Bearer {tok}",
                              "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"}, timeout=20)
    if r.status_code in (401, 429) or r.status_code >= 500:
        # don't let a rate-limit / auth blip masquerade as "no results" and
        # silently under-source a whole run
        raise SystemExit(f"eBay Browse {r.status_code}: {r.text[:200]}")
    time.sleep(0.15)                     # gentle throttle for --all (hundreds of calls)
    return r.json().get("itemSummaries", []) if r.ok else []


def img_of(it):
    return (it.get("image") or {}).get("imageUrl") \
        or ((it.get("thumbnailImages") or [{}])[0]).get("imageUrl")


def get(path, **params):
    r = requests.get(f"{REST}/{path}", headers=H, params=params, timeout=40)
    r.raise_for_status()
    return r.json()


def q_for(s, parallel):
    parts = [str(s["year"]), s["product"], s["player"]]
    if s.get("card_no"):
        parts.append(str(s["card_no"]))
    if parallel:
        parts.append(parallel)
    return " ".join(parts)


def serial_match(title, serial, run):
    # opportunistic: a listing showing this exact copy number (e.g. "11/25").
    # word boundaries reject 15/250 etc; a rare lot-style "5 /25" false positive
    # is acceptable for a soft "likely your copy" hint.
    if serial is None or run is None:
        return False
    return bool(re.search(rf'\b{serial}\s*/\s*{run}\b', title))


def main():
    tok = ebay_token()
    params = {} if ALL else {"checklist_ready": "eq.true"}
    sets = get("rmb_card_sets", select="id,player,year,product,card_no",
               order="featured.desc,id", **params)
    cards_payload, par_payload = [], []

    for s in sets:
        sid = s["id"]
        before = (len(cards_payload), len(par_payload))
        for c in get("rmb_cards", select="id,parallel_name,serial_no,print_run",
                     card_set_id=f"eq.{sid}", image_url="is.null"):
            items = search(tok, q_for(s, c["parallel_name"]))
            if not items:
                continue
            match = next((it for it in items
                          if serial_match(it.get("title", ""), c["serial_no"], c["print_run"])), None)
            url = img_of(match or items[0])
            if url:
                cards_payload.append({"id": c["id"], "url": url,
                                      "source": "ebay", "likely": bool(match)})

        owned_pids = {r["parallel_id"] for r in
                      get("rmb_cards", select="parallel_id", card_set_id=f"eq.{sid}")
                      if r["parallel_id"]}
        for p in get("rmb_parallels", select="id,name", card_set_id=f"eq.{sid}", image_url="is.null"):
            if p["id"] in owned_pids:
                continue  # owned parallels display the owned card's image
            items = search(tok, q_for(s, p["name"]))
            url = img_of(items[0]) if items else None
            if url:
                par_payload.append({"id": p["id"], "url": url})
        dc, dp = len(cards_payload) - before[0], len(par_payload) - before[1]
        print(f"  {s['year']} {s['product']} {s['player']} #{s['card_no']}: "
              f"+{dc} card img, +{dp} ref img", flush=True)

    body = {"payload": {"token": TOKEN, "cards": cards_payload, "parallels": par_payload}}
    r = requests.post(f"{REST}/rpc/rmb_apply_images",
                      headers={**H, "Content-Type": "application/json"}, json=body, timeout=60)
    if not r.ok:
        sys.exit(f"apply failed {r.status_code}: {r.text[:300]}")
    print("sourced:", r.json(), f"— queried cards {len(cards_payload)}, parallels {len(par_payload)}")


if __name__ == "__main__":
    main()
