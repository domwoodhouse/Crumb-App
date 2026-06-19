import type { FeedingRatio } from '../../db/types'

export const COMMON_FLOUR_TYPES = ['white', 'whole-wheat', 'rye', 'spelt', 'mixed']

export interface RatioPreset {
  label: string
  ratio: FeedingRatio
}

export const RATIO_PRESETS: RatioPreset[] = [
  { label: '1:1:1', ratio: { starter: 1, flour: 1, water: 1 } },
  { label: '1:2:2', ratio: { starter: 1, flour: 2, water: 2 } },
  { label: '1:5:5', ratio: { starter: 1, flour: 5, water: 5 } },
]
