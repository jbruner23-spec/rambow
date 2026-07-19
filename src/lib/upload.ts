import { supabase } from './supabase'

// Downscale a phone photo before upload (longest side ~1400px, JPEG) — keeps
// Supabase storage small and loads fast. Falls back to the raw file if the
// browser can't decode it.
async function resize(file: File, max = 1400): Promise<Blob> {
  try {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    img.close()
    return blob ?? file
  } catch {
    return file
  }
}

// Upload a user's own photo for a card: resize → Storage → set image_url + source.
export async function uploadCardPhoto(cardId: number, file: File): Promise<string> {
  const blob = await resize(file)
  const path = `card-${cardId}.jpg`
  const { error: upErr } = await supabase.storage.from('rmb-cards')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (upErr) throw upErr
  // cache-bust so a replaced photo shows immediately
  const url = `${supabase.storage.from('rmb-cards').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
  const { error: dbErr } = await supabase.from('rmb_cards')
    .update({ image_url: url, image_source: 'upload' }).eq('id', cardId).select('id')
  if (dbErr) throw dbErr
  return url
}
