#!/usr/bin/env python3
"""Nightly watch scan: for each active watch, find eBay listings at/under the
target price and push an ntfy alert per new match. Deduped via rmb_alerts, so a
given listing pings once. Writes alerts through the rmb_apply_alerts RPC (anon
key + seed token — no service secret).

Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, RMB_SEED_TOKEN (rambow/.env)
     EBAY_APP_ID, EBAY_CERT_ID, RMB_NTFY_TOPIC

Run: set -a; . ~/rambow/.env; . ~/morning-report/.env; set +a
     uv run --with requests python scripts/scan_watches.py
"""
from __future__ import annotations
import base64
import os
import re
import sys
import requests

URL = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
TOKEN = os.environ.get("RMB_SEED_TOKEN", "")
EBAY_APP, EBAY_CERT = os.environ.get("EBAY_APP_ID"), os.environ.get("EBAY_CERT_ID")
NTFY = os.environ.get("RMB_NTFY_TOPIC")
if not all([URL, KEY, TOKEN, EBAY_APP, EBAY_CERT]):
    sys.exit("missing env — source ~/rambow/.env and ~/morning-report/.env")

REST = f"{URL}/rest/v1"
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
BROWSE = "https://api.ebay.com/buy/browse/v1/item_summary/search"
MAX_PER_WATCH = 3   # cap pushes per watch per run


def ebay_token():
    auth = base64.b64encode(f"{EBAY_APP}:{EBAY_CERT}".encode()).decode()
    r = requests.post("https://api.ebay.com/identity/v1/oauth2/token",
                      headers={"Authorization": f"Basic {auth}",
                               "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "client_credentials",
                            "scope": "https://api.ebay.com/oauth/api_scope"}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def search(tok, q, limit=25):
    r = requests.get(BROWSE, params={"q": q, "limit": limit, "sort": "price"},
                     headers={"Authorization": f"Bearer {tok}",
                              "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"}, timeout=20)
    if r.status_code in (401, 429) or r.status_code >= 500:
        sys.exit(f"eBay {r.status_code}: {r.text[:200]}")
    return r.json().get("itemSummaries", []) if r.ok else []


def graded_ok(title, cond, pref):
    if pref in (None, "", "any"):
        return True
    g = bool(re.search(r"\b(PSA|BGS|SGC|CGC)\b|graded", title or "", re.I)) \
        or (cond and "graded" in cond.lower())
    return g if pref == "graded" else not g


def price_of(it):
    try:
        return float((it.get("price") or {}).get("value"))
    except (TypeError, ValueError):
        return None


def get(path, **params):
    r = requests.get(f"{REST}/{path}", headers=H, params=params, timeout=40)
    r.raise_for_status()
    return r.json()


def ascii_hdr(s):
    # ntfy headers must be latin-1; strip anything a parallel name might carry
    return (s or "").encode("ascii", "replace").decode()


def push(topic, title, body, click):
    # best-effort: a failed push must not abort the run (the alert is already
    # recorded, so it won't re-ping — a missed notification beats duplicate spam)
    try:
        r = requests.post(f"https://ntfy.sh/{topic}", data=body.encode("utf-8"),
                          headers={"Title": ascii_hdr(title), "Tags": "moneybag",
                                   "Click": ascii_hdr(click)}, timeout=15)
        return r.ok
    except requests.RequestException:
        return False


def apply_alerts(rows):
    r = requests.post(f"{REST}/rpc/rmb_apply_alerts",
                      headers={**H, "Content-Type": "application/json"},
                      json={"payload": {"token": TOKEN, "alerts": rows}}, timeout=40)
    if not r.ok:
        sys.exit(f"apply_alerts failed {r.status_code}: {r.text[:200]}")


def main():
    tok = ebay_token()
    watches = get("rmb_watches", select="*,rmb_card_sets(player,year,product,card_no)",
                  status="eq.active")
    total_new, pushed = 0, 0
    for w in watches:
        target = w.get("target_price")
        if target is None:
            continue  # no target -> tracking only, nothing to trigger on
        target = float(target)
        s = w.get("rmb_card_sets") or {}
        q = w.get("query_template") or " ".join(
            str(x) for x in [s.get("year"), s.get("product"), s.get("player"),
                             s.get("card_no"), w["parallel_name"]] if x)
        seen = {a["listing_id"] for a in
                get("rmb_alerts", select="listing_id", watch_id=f"eq.{w['id']}")}
        matches = []
        for it in search(tok, q):   # sort=price -> cheapest first, so the cap keeps the best
            p = price_of(it)
            iid, title = it.get("itemId"), it.get("title", "")
            if not (p is not None and p <= target and iid and iid not in seen):
                continue
            if not graded_ok(title, it.get("condition"), w.get("graded_pref")):
                continue
            matches.append({"watch_id": w["id"], "marketplace": "ebay", "listing_id": iid,
                            "title": title, "price": p, "url": it.get("itemWebUrl") or "",
                            "thumbnail": (it.get("image") or {}).get("imageUrl")})
            if len(matches) >= MAX_PER_WATCH:
                break
        if not matches:
            continue
        # record BEFORE pushing: a pushed listing is always persisted, so a later
        # failure (eBay 429, ntfy timeout) can never leave it un-deduped and re-ping.
        apply_alerts(matches)
        total_new += len(matches)
        if NTFY:
            for m in matches:
                if push(NTFY, f"{w['parallel_name']} under ${target:.0f}",
                        f"${m['price']:.0f} - {m['title'][:80]}", m["url"]):
                    pushed += 1

    print(f"watches={len(watches)} new_matches={total_new} pushed={pushed}")


if __name__ == "__main__":
    main()
