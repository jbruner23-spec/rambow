import type { ReactNode } from 'react'
import { GLOSSARY } from '../lib/glossary'

// Dotted-underline glossary tooltip. `t` keys into GLOSSARY; children are the
// visible text. Falls back to plain text if the term is unknown.
export function Term({ t, children }: { t: string; children: ReactNode }) {
  const def = GLOSSARY[t.toLowerCase()]
  if (!def) return <>{children}</>
  return (
    <span className="term" tabIndex={0}>
      {children}
      <span className="term-tip" role="tooltip">{def}</span>
    </span>
  )
}

// For places where nesting a focusable span is invalid (inside buttons/tiles),
// fall back to a native title tooltip.
export function termTitle(t: string): string | undefined {
  return GLOSSARY[t.toLowerCase()]
}
