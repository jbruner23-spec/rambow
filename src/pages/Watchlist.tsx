import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money } from '../components/cards'
import type { Watch } from '../lib/hunt'

type WatchRow = Watch & { rmb_card_sets: { year: number; product: string; card_no: string; player: string } | null }

export default function Watchlist() {
  const [watches, setWatches] = useState<WatchRow[] | null>(null)

  const load = () => supabase
    .from('rmb_watches')
    .select('*, rmb_card_sets(year,product,card_no,player)')
    .order('created_at', { ascending: false })
    .then(({ data }) => setWatches((data as WatchRow[]) ?? []))

  useEffect(() => { load() }, [])

  const update = async (id: number, patch: Partial<Watch>) => {
    await supabase.from('rmb_watches').update(patch).eq('id', id)
    load()
  }
  const remove = async (id: number) => {
    await supabase.from('rmb_watches').delete().eq('id', id)
    load()
  }

  if (!watches) return <div className="loading">Loading watchlist…</div>

  return (
    <>
      <Link to="/" className="back" style={{ color: 'var(--royal)', marginBottom: 14, display: 'inline-flex' }}>← Dashboard</Link>
      <h1 style={{ margin: '6px 0 2px', fontSize: 26 }}>Watchlist</h1>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {watches.length} watch{watches.length === 1 ? '' : 'es'} · the nightly scan pings you when one lists under target
      </div>

      {watches.length === 0 && (
        <div className="empty">No watches yet. Open a rainbow, tap a missing card, and set a price alert.</div>
      )}

      <div className="wl-list">
        {watches.map((w) => {
          const s = w.rmb_card_sets
          const label = s ? `${s.year} ${s.product}${s.card_no ? ` #${s.card_no}` : ''} · ${s.player}` : ''
          return (
            <div className={`wl-row${w.status === 'paused' ? ' paused' : ''}`} key={w.id}>
              <div className="wl-main">
                <div className="wl-parallel">{w.parallel_name}</div>
                <div className="wl-set">{label}{w.graded_pref && w.graded_pref !== 'any' ? ` · ${w.graded_pref}` : ''}</div>
              </div>
              <div className="wl-target">
                <b>{w.target_price != null ? `≤ ${money(w.target_price)}` : 'any price'}</b>
                <span>{w.status}</span>
              </div>
              <div className="wl-actions">
                <button onClick={() => update(w.id, { status: w.status === 'paused' ? 'active' : 'paused' })}>
                  {w.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button className="danger" onClick={() => remove(w.id)}>Remove</button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
