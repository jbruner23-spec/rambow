import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money } from '../components/cards'
import { Term } from '../components/Term'
import type { Watch } from '../lib/hunt'

type WatchRow = Watch & { rmb_card_sets: { year: number; product: string; card_no: string; player: string } | null }
interface AlertRow {
  id: number
  watch_id: number | null
  marketplace: string
  title: string | null
  price: number | string | null
  url: string | null
  thumbnail: string | null
  outcome: string | null
  created_at: string
  rmb_watches: { parallel_name: string; card_set_id: number | null } | null
}

export default function Watchlist() {
  const [watches, setWatches] = useState<WatchRow[] | null>(null)
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [acquiredNote, setAcquiredNote] = useState<string | null>(null)

  const load = () => {
    supabase
      .from('rmb_watches')
      .select('*, rmb_card_sets(year,product,card_no,player)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setWatches((data as WatchRow[]) ?? []))
    supabase
      .from('rmb_alerts')
      .select('*, rmb_watches(parallel_name, card_set_id)')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setAlerts((data as AlertRow[]) ?? []))
  }

  useEffect(() => { load() }, [])

  const [mutErr, setMutErr] = useState<string | null>(null)

  // supabase-js doesn't throw, and an RLS-blocked update is a "success" with 0
  // rows — so select() the result and treat empty as failure.
  const updateWatch = async (id: number, patch: Partial<Watch>): Promise<boolean> => {
    const { data, error } = await supabase.from('rmb_watches').update(patch).eq('id', id).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    setMutErr(ok ? null : `Couldn’t update the watch${error ? `: ${error.message}` : ''}.`)
    load()
    return ok
  }
  const removeWatch = async (id: number) => {
    const { error } = await supabase.from('rmb_watches').delete().eq('id', id)
    setMutErr(error ? `Couldn’t remove the watch: ${error.message}` : null)
    load()
  }
  const setOutcome = async (a: AlertRow, outcome: 'bought' | 'passed' | 'junk') => {
    const { data, error } = await supabase.from('rmb_alerts').update({ outcome }).eq('id', a.id).select('id')
    if (error || (data?.length ?? 0) === 0) {
      setMutErr(`Couldn’t save the outcome${error ? `: ${error.message}` : ''}.`)
      load()
      return
    }
    setMutErr(null)
    if (outcome === 'bought' && a.watch_id != null) {
      // close the loop: stop scanning this watch, remind about the source of truth
      const ok = await updateWatch(a.watch_id, { status: 'acquired' })
      if (ok) setAcquiredNote(a.rmb_watches?.parallel_name ?? 'Card')
      return
    }
    load()
  }

  if (!watches) {
    return (
      <div className="skel-list">
        {[0, 1, 2].map((i) => <div className="skel skel-row" key={i} />)}
      </div>
    )
  }

  const active = watches.filter((w) => w.status !== 'acquired')
  const acquired = watches.filter((w) => w.status === 'acquired')

  return (
    <>
      <Link to="/" className="back" style={{ color: 'var(--royal)', marginBottom: 14, display: 'inline-flex' }}>← Dashboard</Link>
      <h1 style={{ margin: '6px 0 2px', fontSize: 26 }}>Watchlist</h1>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {active.length} <Term t="watch">watch{active.length === 1 ? '' : 'es'}</Term> · the nightly scan pings you when one lists under target
      </div>

      {mutErr && (
        <div className="banner-err">{mutErr}<button className="banner-x" onClick={() => setMutErr(null)}>×</button></div>
      )}

      {acquiredNote && (
        <div className="banner-ok">
          🎉 {acquiredNote} marked acquired — the scan stops hunting it. Add it to MyFootballCards.xlsx and re-import
          to count it in the rainbow (the spreadsheet stays the source of truth).
          <button className="banner-x" onClick={() => setAcquiredNote(null)}>×</button>
        </div>
      )}

      {active.length === 0 && (
        <div className="empty">No watches yet. Open a rainbow, tap a missing card, and set a price alert.</div>
      )}

      <div className="wl-list">
        {active.map((w) => {
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
                <button onClick={() => updateWatch(w.id, { status: w.status === 'paused' ? 'active' : 'paused' })}>
                  {w.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button onClick={async () => { if (await updateWatch(w.id, { status: 'acquired' })) setAcquiredNote(w.parallel_name) }}>Got it!</button>
                <button className="danger" onClick={() => removeWatch(w.id)}>Remove</button>
              </div>
            </div>
          )
        })}
      </div>

      {alerts.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 28 }}>Recent alerts</div>
          <div className="alert-list">
            {alerts.map((a) => (
              <div className={`alert-row${a.outcome && a.outcome !== 'new' ? ' handled' : ''}`} key={a.id}>
                <div className="al-art">
                  {a.thumbnail
                    ? <img src={a.thumbnail} alt="" referrerPolicy="no-referrer" />
                    : <span>eB</span>}
                </div>
                <div className="al-info">
                  <a className="al-title" href={a.url ?? '#'} target="_blank" rel="noopener noreferrer">{a.title}</a>
                  <div className="al-meta">
                    {a.rmb_watches?.parallel_name} · {a.marketplace} · {new Date(a.created_at).toLocaleDateString()}
                    {a.outcome && a.outcome !== 'new' ? ` · ${a.outcome}` : ''}
                  </div>
                </div>
                <div className="al-price">{money(a.price)}</div>
                {(!a.outcome || a.outcome === 'new') && (
                  <div className="al-actions">
                    <button onClick={() => setOutcome(a, 'bought')}>Bought</button>
                    <button onClick={() => setOutcome(a, 'passed')}>Pass</button>
                    <button className="danger" onClick={() => setOutcome(a, 'junk')}>Junk</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {acquired.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 28 }}>Acquired 🏆</div>
          <div className="wl-list">
            {acquired.map((w) => {
              const s = w.rmb_card_sets
              return (
                <div className="wl-row acquired" key={w.id}>
                  <div className="wl-main">
                    <div className="wl-parallel">{w.parallel_name}</div>
                    <div className="wl-set">{s ? `${s.year} ${s.product}${s.card_no ? ` #${s.card_no}` : ''} · ${s.player}` : ''}</div>
                  </div>
                  <div className="wl-actions">
                    <button className="danger" onClick={() => removeWatch(w.id)}>Clear</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
