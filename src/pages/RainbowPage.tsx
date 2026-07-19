import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Card, CardSet, Parallel, RainbowProgress, Tier } from '../types'
import { TIER_LABEL } from '../types'
import { CardArt, CardModal, serialText, TIER_TERM } from '../components/cards'
import { HuntPanel } from '../components/HuntPanel'
import { Term, termTitle } from '../components/Term'
import { Ring } from '../components/Ring'

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
  const [hunt, setHunt] = useState<Parallel | null>(null)

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
  if (!set || !rows) {
    return (
      <>
        <div className="skel skel-band" />
        <div className="skel-grid">{Array.from({ length: 12 }, (_, i) => <div className="skel skel-tile" key={i} />)}</div>
      </>
    )
  }

  const label = `${set.year} ${set.product}${set.card_no ? ` #${set.card_no}` : ''}`
  const total = prog?.checklist_total ?? rows.length
  const owned = prog?.owned_parallels ?? rows.filter((p) => p.rmb_cards.length).length
  const pct = total ? Math.round((100 * owned) / total) : 0
  const togo = Math.max(0, total - owned)

  const renderTile = (p: ParallelRow) => {
    const card = p.rmb_cards[0]
    const grail = p.tier === 'one_of_one'
    const edge = `edge-${p.tier}`
    if (card) {
      return (
        <button className={`tile ${edge}`} key={p.id} onClick={() => setActive({ card, label })}>
          <div className={`art${grail ? ' grail' : ''}`}>
            <span className={`badge${grail ? ' grail' : ''}`} title={termTitle(TIER_TERM[p.tier])}>{TIER_LABEL[p.tier]}</span>
            {card.likely_your_copy && <span className="badge yours" title={termTitle('your copy')}>Your copy</span>}
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
      <button className={`tile missing ${edge}${p.image_url ? ' has-ref' : ''}`} key={p.id} onClick={() => setHunt(p)}>
        <div className={`art${grail ? ' grail' : ''}`}>
          <span className="badge" title={termTitle(TIER_TERM[p.tier])}>{TIER_LABEL[p.tier]}</span>
          <CardArt url={p.image_url} name={p.name} />
        </div>
        <div className="cap">
          <div className="pn">{p.name}</div>
          <div className="sn"><span className="miss-label">Hunt</span> · {runText(p)}</div>
        </div>
      </button>
    )
  }

  const TIERS: { label: string; keep: (t: Tier) => boolean }[] = [
    { label: 'Grails', keep: (t) => t === 'one_of_one' },
    { label: 'Short prints', keep: (t) => t === 'short_print' },
    { label: 'Numbered', keep: (t) => t === 'numbered' },
    { label: 'Base', keep: (t) => t === 'base' || t === 'unknown' },
  ]
  const grouped = TIERS.map((g) => ({
    label: g.label,
    rows: rows.filter((p) => g.keep(p.tier)).sort((a, b) => rarityKey(a) - rarityKey(b)),
  }))
  // catch any parallel whose tier isn't one of the known values, so nothing
  // silently vanishes from the grid while still counting in the header total
  const matched = new Set(grouped.flatMap((g) => g.rows.map((p) => p.id)))
  const other = rows.filter((p) => !matched.has(p.id)).sort((a, b) => rarityKey(a) - rarityKey(b))
  if (other.length) grouped.push({ label: 'Other', rows: other })
  const groups = grouped.filter((g) => g.rows.length > 0)

  return (
    <>
      <Link to={`/player/${encodeURIComponent(set.player)}`} className="back"
            style={{ color: 'var(--royal)', marginBottom: 14, display: 'inline-flex' }}>
        ← {set.player}
      </Link>

      <div className="rainbow-head v2">
        <Ring pct={pct} size={64} />
        <div className="rh-body">
          <h1>{set.player}
            {pct >= 50 && <Term t="active chase"><span className="chip-chase">Active chase</span></Term>}
          </h1>
          <div className="sub">{label} · {owned} of {total} <Term t="parallel">parallels</Term></div>
          <div className="estnote">
            Checklist covers base Prizm parallels + everything owned; exotic parallels are still being verified.
          </div>
        </div>
        {togo > 0 && <span className="togo">{togo} to go</span>}
      </div>

      {groups.map((g) => (
        <div key={g.label}>
          <div className="tier-h">{g.label}
            <span className="cnt">{g.rows.filter((p) => p.rmb_cards.length).length}/{g.rows.length}</span>
          </div>
          <div className="tile-grid">{g.rows.map(renderTile)}</div>
        </div>
      ))}

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
      {hunt && <HuntPanel set={set} parallel={hunt} onClose={() => setHunt(null)} />}
    </>
  )
}
