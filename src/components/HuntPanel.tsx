import { useEffect, useState } from 'react'
import type { CardSet, Parallel } from '../types'
import { TIER_LABEL } from '../types'
import { money } from './cards'
import { huntEbay, marketplaces, parallelQuery, addWatch, type Listing } from '../lib/hunt'

export function HuntPanel({ set, parallel, onClose, onWatched }:
  { set: CardSet; parallel: Parallel; onClose: () => void; onWatched?: () => void }) {
  const q = parallelQuery(set, parallel.name)
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [target, setTarget] = useState('')
  const [graded, setGraded] = useState('any')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    setListings(null); setFailed(false)
    huntEbay(q, parallel.name)
      .then((r) => { if (!ignore) setListings(r) })
      .catch(() => { if (!ignore) setFailed(true) })
    return () => { ignore = true }
  }, [q])

  const save = async () => {
    setSaving(true)
    const { error } = await addWatch(set, parallel, target ? Number(target) : null, graded)
    setSaving(false)
    if (!error) { setSaved(true); onWatched?.() }
  }

  const setLabel = `${set.year} ${set.product}${set.card_no ? ` #${set.card_no}` : ''}`
  const runText = parallel.print_run === 1 ? '1/1'
    : parallel.print_run != null ? `/${parallel.print_run}` : (TIER_LABEL[parallel.tier] ?? '')

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="hunt" onClick={(e) => e.stopPropagation()}>
        <div className="hunt-head">
          <button className="close" onClick={onClose}>×</button>
          <div className="hk">Hunt · {setLabel}</div>
          <h3>{parallel.name} <span className="run">{runText}</span></h3>
        </div>

        <div className="hunt-watch">
          {saved ? (
            <div className="watch-ok">✓ Added to watchlist — you’ll get an alert when one lists under target.</div>
          ) : (
            <>
              <span className="wl-label">Set a price alert</span>
              <input className="wl-input" type="number" inputMode="decimal" placeholder="Target $"
                     value={target} onChange={(e) => setTarget(e.target.value)} />
              <select className="wl-input" value={graded} onChange={(e) => setGraded(e.target.value)}>
                <option value="any">Any</option>
                <option value="raw">Raw</option>
                <option value="graded">Graded</option>
              </select>
              <button className="wl-btn" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Watch'}
              </button>
            </>
          )}
        </div>

        <div className="hunt-body">
          <div className="hunt-sec">Live on eBay</div>
          {listings === null && !failed && <div className="hunt-loading">Searching eBay…</div>}
          {failed && <div className="hunt-loading">Couldn’t reach eBay just now — try the marketplaces below.</div>}
          {listings && listings.length === 0 && <div className="hunt-loading">No live listings right now.</div>}
          {listings && listings.map((it) => (
            <a key={it.id} className="listing" href={it.url} target="_blank" rel="noopener noreferrer">
              <div className="lart">
                {it.image
                  ? <img src={it.image} alt="" referrerPolicy="no-referrer" />
                  : <span className="ph">eBay</span>}
              </div>
              <div className="linfo">
                <div className="lt">{it.title}</div>
                <div className="lm">{it.condition ?? 'See listing'}{it.auction ? ' · auction' : ''}</div>
              </div>
              <div className="lprice">{money(it.price)}</div>
            </a>
          ))}

          <div className="hunt-sec">Other marketplaces</div>
          <div className="mkt-grid">
            {marketplaces(q).map((m) => (
              <a key={m.name} className="mkt" href={m.url} target="_blank" rel="noopener noreferrer">
                <b>{m.name}</b><span>{m.note}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
