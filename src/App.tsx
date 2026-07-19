import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PlayerPage from './pages/PlayerPage'
import RainbowPage from './pages/RainbowPage'

function TopBar() {
  return (
    <div className="topbar">
      <Link to="/" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="wordmark">Rambow</span>
      </Link>
      <span className="sub">Rainbow Chase</span>
    </div>
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
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
