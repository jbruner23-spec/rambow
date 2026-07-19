import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import PlayerPage from './pages/PlayerPage'
import RainbowPage from './pages/RainbowPage'
import Watchlist from './pages/Watchlist'

function TopBar() {
  const [stat, setStat] = useState<{ cards: number; rainbows: number } | null>(null)
  useEffect(() => {
    Promise.all([
      supabase.from('rmb_cards').select('*', { count: 'exact', head: true }),
      supabase.from('rmb_card_sets').select('*', { count: 'exact', head: true }).eq('checklist_ready', true),
    ]).then(([c, r]) => setStat({ cards: c.count ?? 0, rainbows: r.count ?? 0 }))
  }, [])
  return (
    <header className="header">
      <div className="topbar">
        <div className="topbar-left">
          <Link to="/" className="wordmark">Rambow</Link>
          <nav className="topnav-group">
            <NavLink to="/" end className="topnav">Dashboard</NavLink>
            <NavLink to="/watchlist" className="topnav">Watchlist</NavLink>
          </nav>
        </div>
        {stat && <span className="topstat">{stat.cards} cards · {stat.rainbows} rainbows</span>}
      </div>
      <div className="rainbow-strip" />
    </header>
  )
}

function PlayerRoute() {
  const { name } = useParams()
  return <PlayerPage name={decodeURIComponent(name ?? '')} />
}

function RainbowRoute() {
  const { id } = useParams()
  return <RainbowPage setId={Number(id)} />
}

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <div className="wrap">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/player/:name" element={<PlayerRoute />} />
          <Route path="/rainbow/:id" element={<RainbowRoute />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
