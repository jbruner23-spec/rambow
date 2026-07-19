import { useId } from 'react'

// Circular completion gauge. Rainbow-gradient arc (the product's namesake) on a
// faint track, % in the center. Sized for navy backgrounds (Sol text, white track).
export function Ring({ pct, size = 64, rainbow = true }: { pct: number; size?: number; rainbow?: boolean }) {
  const id = 'ring-' + useId().replace(/[:]/g, '')
  const clamped = Math.max(0, Math.min(100, pct)) || 0
  const circ = 2 * Math.PI * 16
  const dash = (clamped / 100) * circ
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flex: 'none' }}
         role="img" aria-label={`${Math.round(clamped)}% complete`}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="4" />
      {clamped > 0 && (
        <circle
          cx="20" cy="20" r="16" fill="none"
          stroke={rainbow ? `url(#${id})` : 'var(--sol)'} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 20 20)"
        />
      )}
      {rainbow && (
        <defs>
          <linearGradient id={id}>
            <stop offset="0%" stopColor="#3f9e57" />
            <stop offset="50%" stopColor="#ffa300" />
            <stop offset="100%" stopColor="#e5483f" />
          </linearGradient>
        </defs>
      )}
      <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--sol)" fontFamily="Archivo">
        {Math.round(clamped)}%
      </text>
    </svg>
  )
}
