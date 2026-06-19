import type { Feeding, FeedingRatio, Starter } from '../db/types'
import { DAY_MS, formatElapsed, HOUR_MS } from './time'

// --- Hydration ---------------------------------------------------------------
//
// SPEC.md 1.1: hydration is derived from the feed ratio, not entered separately.

export function calculateHydrationPercent(ratio: FeedingRatio): number {
  if (ratio.flour <= 0) {
    return 0
  }
  return (ratio.water / ratio.flour) * 100
}

// --- Peak window estimate -----------------------------------------------------
//
// Heuristic only: a baseline time-to-peak at a reference temperature, scaled by a
// Q10-style temperature factor and by how much flour is in the feed relative to starter
// (more flour for the same amount of starter is more food to get through, so it peaks
// slower). This is a fixed-formula guess, not a measurement.
//
// Phase 8 will calibrate the baseline hours and PEAK_RATE_Q10 below from the user's own
// logged feed-to-peak observations instead of this fixed heuristic.

export const PEAK_BASELINE_TEMP_C = 24
export const PEAK_RATE_Q10 = 2
const MIN_EARLIEST_HOURS = 1
const MIN_WINDOW_SPAN_HOURS = 1

export interface PeakWindowEstimate {
  earliest: Date
  latest: Date
  label: string
}

export function estimatePeakWindow(
  feeding: Pick<Feeding, 'fedAt' | 'ratio'>,
  ambientTempC: number,
): PeakWindowEstimate {
  const starterParts = feeding.ratio.starter > 0 ? feeding.ratio.starter : 1
  const flourMultiplier = feeding.ratio.flour / starterParts

  // Anchors from the brief: 1:1:1 (multiplier 1) peaks in ~4-6h, 1:5:5 (multiplier 5) in
  // ~6-10h at the baseline temperature. Linearly interpolated/extrapolated between those.
  const baselineEarliestHours = 4 + 0.5 * (flourMultiplier - 1)
  const baselineLatestHours = 6 + 1 * (flourMultiplier - 1)

  const rateMultiplier = PEAK_RATE_Q10 ** ((ambientTempC - PEAK_BASELINE_TEMP_C) / 10)

  const earliestHours = Math.max(MIN_EARLIEST_HOURS, baselineEarliestHours / rateMultiplier)
  const latestHours = Math.max(earliestHours + MIN_WINDOW_SPAN_HOURS, baselineLatestHours / rateMultiplier)

  const earliest = new Date(feeding.fedAt + earliestHours * HOUR_MS)
  const latest = new Date(feeding.fedAt + latestHours * HOUR_MS)

  const roundedEarliest = Math.round(earliestHours)
  const roundedLatest = Math.max(roundedEarliest, Math.round(latestHours))

  return {
    earliest,
    latest,
    label: `~${roundedEarliest}–${roundedLatest}h (estimated)`,
  }
}

// --- Next feeding recommendation -----------------------------------------------
//
// Storage-based defaults only, for now. SPEC.md 1.4 also calls for adjusting this by the
// user's intended next use (bake soon / maintain / build up) and by observed time-to-peak
// history — both deferred until there's enough logged data (Phase 8) to calibrate against
// instead of guessing.

const COUNTER_FEED_INTERVAL_HOURS = 12
const FRIDGE_FEED_INTERVAL_DAYS = 7
export const MAINTENANCE_RATIO: FeedingRatio = { starter: 1, flour: 1, water: 1 }

export interface NextFeedingRecommendation {
  recommendedAt: Date
  ratio: FeedingRatio
  reason: string
}

export function recommendNextFeeding(
  starter: Pick<Starter, 'storage' | 'lastFedAt' | 'createdAt'>,
  lastFeeding: Pick<Feeding, 'fedAt' | 'ratio'> | null,
): NextFeedingRecommendation {
  const baseTime = lastFeeding?.fedAt ?? starter.lastFedAt ?? starter.createdAt
  const ratio = lastFeeding?.ratio ?? MAINTENANCE_RATIO

  if (starter.storage === 'fridge') {
    return {
      recommendedAt: new Date(baseTime + FRIDGE_FEED_INTERVAL_DAYS * DAY_MS),
      ratio: MAINTENANCE_RATIO,
      reason:
        'Fridge-stored starters stay healthy on a weekly feed. Planning to bake? Move it to the counter and give it 1–2 feeds at room temperature first.',
    }
  }

  return {
    recommendedAt: new Date(baseTime + COUNTER_FEED_INTERVAL_HOURS * HOUR_MS),
    ratio,
    reason: 'Counter-stored starters are typically fed about every 12 hours to stay active.',
  }
}

// --- Status line -----------------------------------------------------------------
//
// "now" is an explicit argument rather than read from Date.now() inside this function, so
// it stays pure and deterministic for tests — callers pass the current time at render time.

export type StarterStatusTone = 'healthy' | 'attention'

export interface StarterStatus {
  label: string
  tone: StarterStatusTone
}

const PEAK_APPROACH_BUFFER_HOURS = 1
const HUNGRY_AFTER_PEAK_HOURS = 6

export function describeStarterStatus(
  latestFeeding: Pick<Feeding, 'fedAt' | 'ratio' | 'ambientTempC' | 'peakedAt'> | null,
  now: number,
): StarterStatus {
  if (!latestFeeding) {
    return { label: 'Never fed yet — feed to get started', tone: 'attention' }
  }

  if (latestFeeding.peakedAt !== null) {
    const sincePeak = now - latestFeeding.peakedAt
    if (sincePeak > HUNGRY_AFTER_PEAK_HOURS * HOUR_MS) {
      return { label: 'Hungry — feed before use', tone: 'attention' }
    }
    return { label: `Peaked ${formatElapsed(sincePeak)} ago — ready to use`, tone: 'healthy' }
  }

  const elapsed = formatElapsed(now - latestFeeding.fedAt)
  const { earliest, latest } = estimatePeakWindow(latestFeeding, latestFeeding.ambientTempC)
  const approachStart = earliest.getTime() - PEAK_APPROACH_BUFFER_HOURS * HOUR_MS

  if (now < approachStart) {
    return { label: `Fed ${elapsed} ago — rising`, tone: 'healthy' }
  }
  if (now <= latest.getTime()) {
    return { label: `Fed ${elapsed} ago — likely peaking soon`, tone: 'healthy' }
  }
  return { label: 'Hungry — feed before use', tone: 'attention' }
}
