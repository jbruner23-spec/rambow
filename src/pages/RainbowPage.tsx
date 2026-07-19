import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Card, CardSet, Parallel, RainbowProgress } from '../types'
import { TIER_LABEL } from '../types'
import { CardArt, CardModal, serialText } from '../components/cards'

type ParallelRow = Parallel & { rmb_cards: Card[] }

function runText(p: ParallelRow) {
  if (p.print_run === 1) return '1/1'
  if (p.print_run != null) return `/${p.print_run}`
  return TIER_LABEL[p.tier] ?? 'Unnumbered'
}

// rarest-first: 1/1s and low serials lead, unnumbered exotics trail
function rarityKey(p: ParallelRow) {
  return p.print_run ?? 100000
}

export default function RainbowPage({ setId }: { setId: number }) {
  const [set, setSet] = useState<CardSet | null>(null)
  const [prog, setProg] = useState<RainbowProgress | null>(null)
  const [rows, setRows] = useState<ParallelRow[] | null>(null)
  const [unlinked, setUnlinked] = useState<Card[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [active, setActive] = useState<{ card: Card; label: string } | null>(null)

  useEffect(() => {
    let ignore = false
    setSet(null); setRows(null); setErr(null); setUnlinked([])
    Promise.all([
      supabase.from('rmb_card_sets').select('*').eq('id', setId).single(),
      supabase.from('rmb_rainbow_progress').select('*').eq('card_set_id', setId).single(),
      supabase.from('rmb_parallels').select('*, rmb_cards(*)').eq('card_set_id', setId),
      // owned cards not matched to any checklist parallel — surfaced so nothing hides
      supabase.from('rmb_cards').select('*').eq('card_set_id', setId).is('parallel_id', null),
    ]).then(([s, pr, ps, un]) => {
      if (ignore) return
      if (s.error) return setErr(s.error.message)
      setSet(s.data as CardSet)
      setProg(pr.data as RainbowProgress | null)
      setRows((ps.data as ParallelRow[]) ?? [])
      setUnlinked((un.data as Card[]) ?? [])
    })
    return () => { ignore = true }
  }, [setId])

  if (err) return <div className="empty">Couldn’t load: {err}</div>
  if (!set || !rows) return <div className="loading">Loading rainbow…</div>

  const label = `${set.year} ${set.product}${set.card_no ? ` #${set.card_no}` : ''}`
  const total = prog?.checklist_total ?? rows.length
  const owned = prog?.owned_parallels ?? rows.filter((p) => p.rmb_cards.length).length
  const pct = total ? Math.round((100 * owned) / total) : 0
  const sorted = [...rows].sort((a, b) => rarityKey(a) - rarityKey(b))

  return (
    <>
      <Link to={`/player/${encodeURIComponent(set.player)}`} className="back"
            style={{ color: 'var(--royal)', marginBottom: 14, display: 'inline-flex' }}>
        ← {set.player}
      </Link>

      <div className="rainbow-head">
        <h1>{set.player}
          {pct >= 50 && <span className="chip-chase">Active chase</span>}
        </h1>
        <div className="sub">{label} · rainbow</div>
        <div className="prog">
          <span className="big">{owned}/{total}</span>
          <div className="meter"><i style={{ width: `${pct}%` }} /></div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{pct}%</span>
        </div>
        <div className="estnote">
          Checklist covers base Prizm parallels + everything owned; exotic parallels are still being verified,
          so completion may ease as the checklist grows.
        </div>
      </div>

      <div className="tile-grid">
        {sorted.map((p) => {
          const card = p.rmb_cards[0]
          const grail = p.tier === 'one_of_one'
          if (card) {
            return (
              <button className="tile" key={p.id}
                      onClick={() => setActive({ card, label })}>
                <div className={`art${grail ? ' grail' : ''}`}>
                  <span className={`badge${grail ? ' grail' : ''}`}>{TIER_LABEL[p.tier]}</span>
                  <CardArt url={card.image_url} name={p.name} />
                </div>
                <div className="cap">
                  <div className="pn">{p.name}</div>
                  <div className="sn">{serialText(card) ?? runText(p)}{p.rmb_cards.length > 1 ? ` · ×${p.rmb_cards.length}` : ''}</div>
                </div>
              </button>
            )
          }
          return (
            <div className={`tile missing${p.image_url ? ' has-ref' : ''}`} key={p.id}>
              <div className={`art${grail ? ' grail' : ''}`}>
                <span className="badge">{TIER_LABEL[p.tier]}</span>
                <CardArt url={p.image_url} name={p.name} />
              </div>
              <div className="cap">
                <div className="pn">{p.name}</div>
                <div className="sn"><span className="miss-label">Missing</span> · {runText(p)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {unlinked.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 26 }}>Owned · not yet on the checklist</div>
          <div className="tile-grid">
            {unlinked.map((c) => (
              <button className="tile" key={c.id} onClick={() => setActive({ card: c, label })}>
                <div className="art"><span className="ph">{c.parallel_name ?? 'Base'}</span></div>
                <div className="cap">
                  <div className="pn">{c.parallel_name ?? 'Base'}</div>
                  <div className="sn">{serialText(c) ?? 'Owned'}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {active && <CardModal card={active.card} setLabel={active.label} onClose={() => setActive(null)} />}
    </>
  )
}
