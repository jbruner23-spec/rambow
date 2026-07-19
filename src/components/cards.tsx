import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Card, Tier } from '../types'
import { TIER_LABEL } from '../types'
import { Term, termTitle } from './Term'
import { uploadCardPhoto } from '../lib/upload'

// glossary key per tier, for badge tooltips
export const TIER_TERM: Record<Tier, string> = {
  one_of_one: '1/1', short_print: 'sp', numbered: 'numbered', base: 'base', unknown: 'unnumbered',
}

// Sourced image with graceful fallback to the parallel-name placeholder
// (eBay URLs can 404 when a listing ends). no-referrer keeps the CDN from
// logging the app's origin.
export function CardArt({ url, name }: { url: string | null; name: string }) {
  const [ok, setOk] = useState(true)
  useEffect(() => setOk(true), [url])   // retry when the image url changes
  if (url && ok) {
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setOk(false)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  return <span className="ph">{name}</span>
}

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
        {tier && (
          <span className={`badge${grail ? ' grail' : ''}`}
                title={card.tier ? termTitle(TIER_TERM[card.tier]) : undefined}>{tier}</span>
        )}
        {card.likely_your_copy && <span className="badge yours" title={termTitle('your copy')}>Your copy</span>}
        <CardArt url={card.image_url} name={card.parallel_name ?? 'Base'} />
      </div>
      <div className="cap">
        <div className="pn">{card.parallel_name ?? 'Base'}</div>
        <div className="sn">{[sn, card.graded].filter(Boolean).join(' · ') || 'Raw'}</div>
      </div>
    </button>
  )
}

export function CardModal({ card, setLabel, onClose, onPhoto }:
  { card: Card; setLabel: string; onClose: () => void; onPhoto?: (cardId: number, url: string) => void }) {
  const grail = card.tier === 'one_of_one'
  const sn = serialText(card)
  const fileRef = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState(card.image_url)
  const [src, setSrc] = useState(card.image_source)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const url = await uploadCardPhoto(card.id, file)
      setImg(url); setSrc('upload')
      onPhoto?.(card.id, url)
    } catch (x) {
      setErr('Upload failed — try again.')
      console.error(x)
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className={`mart${grail ? ' grail' : ''}`}>
          <CardArt url={img} name={card.parallel_name ?? 'Base'} />
        </div>
        <div className="mbody">
          <button className="close" onClick={onClose}>×</button>
          <h3>{card.parallel_name ?? 'Base'}</h3>
          <div className="msub">{setLabel}</div>
          <div className="mgrid">
            <div><b><Term t="serial">Serial</Term></b>{sn ?? 'Unnumbered'}</div>
            <div><b><Term t="print run">Print run</Term></b>{card.print_run != null ? card.print_run.toLocaleString() : 'Unknown'}</div>
            <div><b><Term t="grade">Grade</Term></b>{card.graded ?? 'Raw'}</div>
            <div><b>Paid</b>{money(card.purchase_price)}</div>
          </div>
          {img && src === 'ebay' && !card.likely_your_copy && (
            <div className="imgnote">Representative image from an eBay listing — not your exact copy.</div>
          )}
          {img && src === 'upload' && (
            <div className="imgnote you">Your photo.</div>
          )}
          {img && src === 'ebay' && card.likely_your_copy && (
            <div className="imgnote you">Listing showed your serial — likely your actual copy.</div>
          )}
          {card.notes && <div className="note">{card.notes}</div>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
                 style={{ display: 'none' }} onChange={onPick} />
          <button className="photo-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : img && src === 'upload' ? '📷 Replace my photo' : '📷 Use my own photo'}
          </button>
          {err && <div className="imgnote" style={{ color: 'var(--sol-deep)' }}>{err}</div>}
        </div>
      </div>
    </div>
  )
}
