import { supabase } from './supabase'
import type { CardSet, Parallel } from '../types'

export interface Listing {
  id: string
  title: string
  price: number | null
  currency: string
  url: string
  image: string | null
  condition: string | null
  auction: boolean
}

// eBay search query for a specific parallel of a card
export function parallelQuery(set: Pick<CardSet, 'year' | 'product' | 'player' | 'card_no'>, name: string) {
  return [set.year, set.product, set.player, set.card_no, name].filter(Boolean).join(' ')
}

// Live eBay listings via the `hunt` edge function (creds stay server-side).
// `parallel` lets the function drop wrong-variant listings (e.g. Die-Cut Gold
// when hunting base Gold).
export async function huntEbay(q: string, parallel?: string): Promise<Listing[]> {
  const { data, error } = await supabase.functions.invoke('hunt', { body: { q, limit: 30, parallel } })
  if (error) throw error
  return (data?.items ?? []) as Listing[]
}

// One-tap searches on the other card marketplaces. eBay has an API (rendered
// in-panel); the rest deep-link to the marketplace's own live search.
export function marketplaces(q: string) {
  const e = encodeURIComponent(q)
  const site = (domain: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`
  return [
    // COMC/Whatnot search paths aren't shareable-URL friendly, so route via a
    // site-scoped Google search that lands on their card pages. Others deep-link direct.
    { name: 'COMC', url: site('comc.com'), note: 'scanned singles' },
    { name: 'MySlabs', url: `https://myslabs.com/search/?q=${e}`, note: 'graded, low fees' },
    { name: 'Sportlots', url: site('sportlots.com'), note: 'cheap filler' },
    { name: 'Whatnot', url: site('whatnot.com'), note: 'live auctions' },
    { name: 'Beckett', url: `https://marketplace.beckett.com/search_new/?q=${e}`, note: 'dealers' },
    { name: 'Fanatics', url: site('fanaticscollect.com'), note: 'premium auctions' },
    { name: 'Goldin', url: site('goldin.co'), note: 'grails' },
    // 130point's comp search is a POST form with no shareable query URL — this
    // opens the search page; paste the card to check recent sold prices.
    { name: '130point', url: `https://130point.com/sales/`, note: 'sold comps — search there' },
  ]
}

export interface Watch {
  id: number
  card_set_id: number | null
  parallel_name: string
  query_template: string | null
  target_price: number | null
  graded_pref: string | null
  status: string
  created_at: string
}

export async function addWatch(set: CardSet, p: Pick<Parallel, 'name'>,
                               target: number | null, gradedPref: string) {
  // upsert on (card_set_id, parallel_name) so re-watching just updates the target
  return supabase.from('rmb_watches').upsert({
    card_set_id: set.id,
    parallel_name: p.name,
    query_template: parallelQuery(set, p.name),
    target_price: target,
    graded_pref: gradedPref,
    status: 'active',
  }, { onConflict: 'card_set_id,parallel_name' })
}
