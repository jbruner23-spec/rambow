import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money } from '../components/cards'
import { SearchBox } from '../components/SearchBox'
import { Term } from '../components/Term'
import { Ring } from '../components/Ring'

interface PlayerStat {
  name: string
  featured: boolean
  jersey_no: string | null
  sort_order: number
  cards: number
  sets: number
  ones: number
  graded: number
  spend: string   // numeric column arrives from PostgREST as a string
}

interface Chase {
  card_set_id: number
  player: string
  year: number
  product: string
  card_no: string
  owned_parallels: number
  checklist_total: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<PlayerStat[] | null>(null)
  const [chases, setChases] = useState<Chase[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('rmb_player_stats').select('*').order('sort_order')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setStats(data as PlayerStat[])
      })
    supabase.from('rmb_rainbow_progress')
      .select('card_set_id, player, year, product, card_no, owned_parallels, checklist_total')
      .eq('checklist_ready', true)
      .then(({ data }) => setChases((data as Chase[]) ?? []))
  }, [])

  if (err) return <div className="empty">Couldn’t load: {err}</div>
  if (!stats) {
    return (
      <>
        <div className="skel skel-band" />
        <div className="skel-list">{[0, 1, 2, 3].map((i) => <div className="skel skel-row" key={i} />)}</div>
      </>
    )
  }

  const total = stats.reduce(
    (a, s) => ({
      cards: a.cards + s.cards, sets: a.sets + s.sets, ones: a.ones + s.ones,
      graded: a.graded + s.graded, spend: a.spend + Number(s.spend),
    }),
    { cards: 0, sets: 0, ones: 0, graded: 0, spend: 0 },
  )
  const featured = stats.filter((s) => s.featured)
  const rail = chases
    .map((c) => ({ ...c, pct: c.checklist_total ? Math.round((100 * c.owned_parallels) / c.checklist_total) : 0 }))
    .sort((a, b) => b.pct - a.pct)
  // best (highest-%) chase per player — rail is sorted desc, so the first wins
  const bestByPlayer: Record<string, (typeof rail)[number]> = {}
  for (const c of rail) if (!bestByPlayer[c.player]) bestByPlayer[c.player] = c

  return (
    <>
      <div className="statband">
        <div className="stat"><b>{total.cards}</b><span>Cards</span></div>
        <div className="stat"><b>{total.sets}</b><span>Card sets</span></div>
        <div className="stat"><b>{total.ones}</b><span><Term t="1/1">1/1s</Term></span></div>
        <div className="stat"><b>{total.graded}</b><span><Term t="grade">Graded</Term></span></div>
        <div className="stat"><b>{money(total.spend)}</b><span>Invested</span></div>
      </div>

      <SearchBox />

      {featured.length > 0 && (
        <>
          <div className="eyebrow">Featured chases</div>
          <div className="feature-grid">
            {featured.map((s) => {
              const best = bestByPlayer[s.name]
              return (
                <Link key={s.name} to={`/player/${encodeURIComponent(s.name)}`} className="feature">
                  <span className="jersey">{s.jersey_no ? `#${s.jersey_no}` : ''}</span>
                  {best && <Ring pct={best.pct} size={56} />}
                  <div className="fbody">
                    <span className="kicker">{best ? 'Featured · best chase' : 'Featured'}</span>
                    <h3>{s.name}</h3>
                    {best
                      ? <div className="fstat">{best.year} {best.product}{best.card_no ? ` #${best.card_no}` : ''} · {best.owned_parallels}/{best.checklist_total} · <b style={{ color: 'var(--sol)' }}>{best.checklist_total - best.owned_parallels} to go</b></div>
                      : <div className="fstat"><b>{s.cards}</b> cards · <b>{s.sets}</b> sets</div>}
                    <div className="fstat">{s.cards} cards · {s.ones} one-of-one{s.ones === 1 ? '' : 's'}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {rail.length > 0 && (
        <>
          <div className="eyebrow">Closest to done</div>
          <div className="chase-rail">
            {rail.map((c) => (
              <Link key={c.card_set_id} to={`/rainbow/${c.card_set_id}`} className="chase">
                <div className="cinfo">
                  <div className="ctitle">{c.player}</div>
                  <div className="cmeta">{c.year} {c.product}{c.card_no ? ` #${c.card_no}` : ''} · {c.owned_parallels}/{c.checklist_total} parallels</div>
                </div>
                <div className="cbar"><div className="meter sm"><i style={{ width: `${c.pct}%` }} /></div></div>
                <div className="cpct">{c.pct}%</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="eyebrow">All players</div>
      <div className="player-list">
        {stats.map((s) => (
          <Link key={s.name} to={`/player/${encodeURIComponent(s.name)}`}
                className={`player-row${s.featured ? ' feat' : ''}`}>
            <div className="num">{s.jersey_no ?? '—'}</div>
            <div>
              <div className="pname">
                {s.name} {s.featured && <span className="chip-feat">Featured</span>}
              </div>
              <div className="pmeta">{s.sets} card set{s.sets === 1 ? '' : 's'} · {money(s.spend)} invested</div>
            </div>
            <div className="count"><b className="mono-num">{s.cards}</b><span>cards</span></div>
          </Link>
        ))}
      </div>
    </>
  )
}
