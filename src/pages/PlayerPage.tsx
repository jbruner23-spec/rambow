import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Card, CardSet, RainbowProgress } from '../types'
import { CardTile, CardModal } from '../components/cards'

type SetWithCards = CardSet & { rmb_cards: Card[] }
type Prog = { ready: boolean; pct: number; owned: number; total: number }

function setLabel(s: CardSet) {
  return `${s.year} ${s.product}${s.card_no ? ` #${s.card_no}` : ''}`
}

export default function PlayerPage({ name }: { name: string }) {
  const [sets, setSets] = useState<SetWithCards[] | null>(null)
  const [prog, setProg] = useState<Record<number, Prog>>({})
  const [err, setErr] = useState<string | null>(null)
  const [active, setActive] = useState<{ card: Card; label: string } | null>(null)

  useEffect(() => {
    let ignore = false
    setSets(null)
    supabase
      .from('rmb_card_sets')
      .select('*, rmb_cards(*)')
      .eq('player', name)
      .order('year', { ascending: true })
      .order('product', { ascending: true })
      .order('card_no', { ascending: true })
      .order('id', { referencedTable: 'rmb_cards', ascending: true })
      .then(({ data, error }) => {
        if (ignore) return
        if (error) setErr(error.message)
        else setSets(data as SetWithCards[])
      })
    supabase.from('rmb_rainbow_progress').select('*').eq('player', name)
      .then(({ data }) => {
        if (ignore || !data) return
        const map: Record<number, Prog> = {}
        for (const r of data as RainbowProgress[]) {
          map[r.card_set_id] = {
            ready: r.checklist_ready, owned: r.owned_parallels, total: r.checklist_total,
            pct: r.checklist_total ? Math.round((100 * r.owned_parallels) / r.checklist_total) : 0,
          }
        }
        setProg(map)
      })
    return () => { ignore = true }
  }, [name])

  if (err) return <div className="empty">Couldn’t load: {err}</div>
  if (!sets) {
    return (
      <div className="skel-grid">{Array.from({ length: 10 }, (_, i) => <div className="skel skel-tile" key={i} />)}</div>
    )
  }
  if (sets.length === 0) return (
    <div className="empty">
      No cards found for “{name}”. <Link to="/" style={{ color: 'var(--royal)', fontWeight: 600 }}>Back to all players</Link>
    </div>
  )

  const totalCards = sets.reduce((a, s) => a + s.rmb_cards.length, 0)
  // deepest sets first — most owned parallels = closest to a rainbow
  const ordered = [...sets].sort((a, b) => b.rmb_cards.length - a.rmb_cards.length)

  return (
    <>
      <Link to="/" className="back" style={{ color: 'var(--royal)', marginBottom: 14, display: 'inline-flex' }}>
        ← All players
      </Link>
      <h1 style={{ margin: '6px 0 2px', fontSize: 26 }}>{name}</h1>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
        {totalCards} cards across {sets.length} card set{sets.length === 1 ? '' : 's'}
      </div>

      {ordered.map((s) => {
        const p = prog[s.id]
        return (
          <div className="setblock" key={s.id}>
            <div className="sethead">
              {p?.ready
                ? <Link to={`/rainbow/${s.id}`} className="settitle" style={{ color: 'var(--royal)' }}>{setLabel(s)} →</Link>
                : <span className="settitle">{setLabel(s)}</span>}
              {p?.ready
                ? <span className="owned">{p.owned}/{p.total} · {p.pct}%</span>
                : <span className="owned">{s.rmb_cards.length} owned</span>}
            </div>
            {p?.ready && (
              <div className="meter sm" style={{ margin: '0 0 10px' }}><i style={{ width: `${p.pct}%` }} /></div>
            )}
            <div className="tile-grid">
              {s.rmb_cards.map((c) => (
                <CardTile key={c.id} card={c} onClick={() => setActive({ card: c, label: setLabel(s) })} />
              ))}
            </div>
          </div>
        )
      })}

      {active && (
        <CardModal card={active.card} setLabel={active.label} onClose={() => setActive(null)}
          onPhoto={(cardId, url) => setSets((prev) => prev?.map((s) => ({
            ...s, rmb_cards: s.rmb_cards.map((c) => c.id === cardId ? { ...c, image_url: url, image_source: 'upload' } : c),
          })) ?? prev)} />
      )}
    </>
  )
}
