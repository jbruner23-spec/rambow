import type { Card } from '../types'
import { TIER_LABEL } from '../types'

export function money(n: number | string | null | undefined) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function serialText(c: Card) {
  if (c.print_run === 1) return '1/1'
  if (c.serial_no != null && c.print_run != null) return `${c.serial_no}/${c.print_run}`
  if (c.print_run != null) return `/${c.print_run}`
  return null
}

export function CardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  const grail = card.tier === 'one_of_one'
  const tier = card.tier ? TIER_LABEL[card.tier] : null
  const sn = serialText(card)
  return (
    <button className="tile" onClick={onClick}>
      <div className={`art${grail ? ' grail' : ''}`}>
        {tier && <span className={`badge${grail ? ' grail' : ''}`}>{tier}</span>}
        {card.image_url
          ? <img src={card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span className="ph">{card.parallel_name ?? 'Base'}</span>}
      </div>
      <div className="cap">
        <div className="pn">{card.parallel_name ?? 'Base'}</div>
        <div className="sn">{[sn, card.graded].filter(Boolean).join(' · ') || 'Raw'}</div>
      </div>
    </button>
  )
}

export function CardModal({ card, setLabel, onClose }:
  { card: Card; setLabel: string; onClose: () => void }) {
  const grail = card.tier === 'one_of_one'
  const sn = serialText(card)
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className={`mart${grail ? ' grail' : ''}`}>
          {card.image_url
            ? <img src={card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="ph">{card.parallel_name ?? 'Base'}</span>}
        </div>
        <div className="mbody">
          <button className="close" onClick={onClose}>×</button>
          <h3>{card.parallel_name ?? 'Base'}</h3>
          <div className="msub">{setLabel}</div>
          <div className="mgrid">
            <div><b>Serial</b>{sn ?? 'Unnumbered'}</div>
            <div><b>Print run</b>{card.print_run != null ? card.print_run.toLocaleString() : 'Unknown'}</div>
            <div><b>Grade</b>{card.graded ?? 'Raw'}</div>
            <div><b>Paid</b>{money(card.purchase_price)}</div>
          </div>
          {card.notes && <div className="note">{card.notes}</div>}
        </div>
      </div>
    </div>
  )
}
