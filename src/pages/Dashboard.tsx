import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money } from '../components/cards'

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

export default function Dashboard() {
  const [stats, setStats] = useState<PlayerStat[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('rmb_player_stats').select('*').order('sort_order')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setStats(data as PlayerStat[])
      })
  }, [])

  if (err) return <div className="empty">Couldn’t load: {err}</div>
  if (!stats) return <div className="loading">Loading the collection…</div>

  const total = stats.reduce(
    (a, s) => ({
      cards: a.cards + s.cards, sets: a.sets + s.sets, ones: a.ones + s.ones,
      graded: a.graded + s.graded, spend: a.spend + Number(s.spend),
    }),
    { cards: 0, sets: 0, ones: 0, graded: 0, spend: 0 },
  )
  const featured = stats.filter((s) => s.featured)

  return (
    <>
      <div className="statband">
        <div className="stat"><b>{total.cards}</b><span>Cards</span></div>
        <div className="stat"><b>{total.sets}</b><span>Card sets</span></div>
        <div className="stat"><b>{total.ones}</b><span>1/1s</span></div>
        <div className="stat"><b>{total.graded}</b><span>Graded</span></div>
        <div className="stat"><b>{money(total.spend)}</b><span>Invested</span></div>
      </div>

      {featured.length > 0 && (
        <>
          <div className="eyebrow">Featured chases</div>
          <div className="feature-grid">
            {featured.map((s) => (
              <Link key={s.name} to={`/player/${encodeURIComponent(s.name)}`} className="feature">
                <span className="jersey">{s.jersey_no ? `#${s.jersey_no}` : ''}</span>
                <span className="kicker">Featured</span>
                <h3>{s.name}</h3>
                <div className="fstat"><b>{s.cards}</b> cards · <b>{s.sets}</b> sets</div>
                <div className="fstat">{s.ones} one-of-one{s.ones === 1 ? '' : 's'} · {money(s.spend)} in</div>
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
