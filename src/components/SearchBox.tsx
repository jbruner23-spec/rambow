import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { serialText } from './cards'
import type { Card } from '../types'

type Hit = Card & {
  rmb_card_sets: { player: string; year: number; product: string; card_no: string; checklist_ready: boolean } | null
}

// Whole-collection search. The collection is small (hundreds of cards), so we
// fetch once on first use and filter client-side — instant results, one request.
export function SearchBox() {
  const [q, setQ] = useState('')
  const [all, setAll] = useState<Hit[] | null>(null)
  const [failed, setFailed] = useState(false)
  const loading = useRef(false)

  useEffect(() => {
    if (!q.trim() || all || loading.current) return
    loading.current = true
    supabase
      .from('rmb_cards')
      .select('id, card_set_id, parallel_name, tier, serial_no, print_run, graded, image_url, likely_your_copy, rmb_card_sets(player, year, product, card_no, checklist_ready)')
      .limit(5000) // explicit — the default 1000-row cap would truncate silently as the collection grows
      .then(({ data, error }) => {
        loading.current = false
        if (error) setFailed(true)
        else { setFailed(false); setAll((data as unknown as Hit[]) ?? []) }
      })
  }, [q, all])

  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  const hits = tokens.length === 0 || !all ? [] : all.filter((c) => {
    const s = c.rmb_card_sets
    if (!s) return false // orphaned card: no set to label or link to
    const hay = `${s.player} ${s.year} ${s.product} ${s.card_no} ${c.parallel_name ?? 'base'} ${c.graded ?? 'raw'}`.toLowerCase()
    return tokens.every((t) => hay.includes(t))
  }).slice(0, 25)

  return (
    <div className="searchbox">
      <input
        className="search-input"
        type="search"
        placeholder="Search your collection — player, set, parallel, grade…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search collection"
      />
      {q.trim() && (
        <div className="search-results">
          {failed && <div className="search-note">Search unavailable right now.</div>}
          {!failed && !all && <div className="search-note">Loading collection…</div>}
          {all && hits.length === 0 && <div className="search-note">No cards match “{q}”.</div>}
          {hits.map((c) => {
            const s = c.rmb_card_sets
            const label = s ? `${s.year} ${s.product}${s.card_no ? ` #${s.card_no}` : ''}` : ''
            const to = s?.checklist_ready ? `/rainbow/${c.card_set_id}` : `/player/${encodeURIComponent(s?.player ?? '')}`
            return (
              <Link key={c.id} to={to} className="search-hit" onClick={() => setQ('')}>
                <div className="sh-art">
                  {c.image_url
                    ? <img src={c.image_url} alt="" referrerPolicy="no-referrer" />
                    : <span>{(c.parallel_name || 'Base')[0]}</span>}
                </div>
                <div className="sh-info">
                  <div className="sh-name">{c.parallel_name ?? 'Base'}</div>
                  <div className="sh-meta">{s?.player} · {label}</div>
                </div>
                <div className="sh-right">{[serialText(c), c.graded ?? 'Raw'].filter(Boolean).join(' · ')}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
