export type Tier = 'base' | 'numbered' | 'short_print' | 'one_of_one' | 'unknown'

export interface Player {
  name: string
  featured: boolean
  jersey_no: string | null
  sort_order: number
}

export interface CardSet {
  id: number
  player: string
  year: number
  product: string
  card_no: string
  featured: boolean
}

export interface Card {
  id: number
  card_set_id: number
  parallel_id: number | null
  parallel_name: string | null
  tier: Tier | null
  serial_no: number | null
  print_run: number | null
  graded: string | null
  purchase_price: number | null
  notes: string | null
  image_url: string | null
  image_source: string | null
  likely_your_copy: boolean
}

export interface Parallel {
  id: number
  card_set_id: number
  name: string
  tier: Tier
  print_run: number | null
  status: 'verified' | 'estimated' | 'discovered'
  image_url: string | null
  thumbnail: string | null
}

export interface RainbowProgress {
  card_set_id: number
  player: string
  year: number
  product: string
  card_no: string
  featured: boolean
  checklist_ready: boolean
  owned_cards: number
  checklist_total: number
  owned_parallels: number
}

export const TIER_LABEL: Record<Tier, string> = {
  one_of_one: '1/1',
  short_print: 'SP',        // actual /N shown in the caption; run varies (≤25)
  numbered: '#’d',
  base: 'Base',
  unknown: 'Unnumbered',
}
