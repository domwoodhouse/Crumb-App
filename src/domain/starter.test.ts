import { describe, expect, it } from 'vitest'
import { HOUR_MS } from './time'
import {
  calculateHydrationPercent,
  describeStarterStatus,
  estimatePeakWindow,
  MAINTENANCE_RATIO,
  recommendNextFeeding,
} from './starter'

const NOW = 1_700_000_000_000

describe('calculateHydrationPercent', () => {
  it('computes 100% for a 1:1:1 ratio', () => {
    expect(calculateHydrationPercent({ starter: 1, flour: 1, water: 1 })).toBe(100)
  })

  it('computes 100% for a 1:5:5 ratio (equal flour and water)', () => {
    expect(calculateHydrationPercent({ starter: 1, flour: 5, water: 5 })).toBe(100)
  })

  it('computes hydration below 100% when water is less than flour', () => {
    expect(calculateHydrationPercent({ starter: 1, flour: 2, water: 1 })).toBe(50)
  })

  it('returns 0 rather than dividing by zero when flour is 0', () => {
    expect(calculateHydrationPercent({ starter: 1, flour: 0, water: 5 })).toBe(0)
  })
})

describe('estimatePeakWindow', () => {
  const fedAt = NOW

  it('estimates ~4-6h for a 1:1:1 feed at the baseline temperature', () => {
    const result = estimatePeakWindow({ fedAt, ratio: { starter: 1, flour: 1, water: 1 } }, 24)

    expect(result.earliest.getTime() - fedAt).toBe(4 * HOUR_MS)
    expect(result.latest.getTime() - fedAt).toBe(6 * HOUR_MS)
    expect(result.label).toContain('estimated')
  })

  it('estimates ~6-10h for a 1:5:5 feed at the baseline temperature (more flour, slower)', () => {
    const result = estimatePeakWindow({ fedAt, ratio: { starter: 1, flour: 5, water: 5 } }, 24)

    expect(result.earliest.getTime() - fedAt).toBe(6 * HOUR_MS)
    expect(result.latest.getTime() - fedAt).toBe(10 * HOUR_MS)
  })

  it('roughly halves the window 10°C above baseline (Q10 doubling)', () => {
    const result = estimatePeakWindow({ fedAt, ratio: { starter: 1, flour: 1, water: 1 } }, 34)

    expect(result.earliest.getTime() - fedAt).toBe(2 * HOUR_MS)
    expect(result.latest.getTime() - fedAt).toBe(3 * HOUR_MS)
  })

  it('roughly doubles the window 10°C below baseline (Q10 halving)', () => {
    const result = estimatePeakWindow({ fedAt, ratio: { starter: 1, flour: 1, water: 1 } }, 14)

    expect(result.earliest.getTime() - fedAt).toBe(8 * HOUR_MS)
    expect(result.latest.getTime() - fedAt).toBe(12 * HOUR_MS)
  })

  it('clamps to a sane minimum window at extreme heat instead of collapsing to zero', () => {
    const result = estimatePeakWindow({ fedAt, ratio: { starter: 1, flour: 1, water: 1 } }, 54)

    expect(result.earliest.getTime()).toBeGreaterThan(fedAt)
    expect(result.latest.getTime()).toBeGreaterThan(result.earliest.getTime())
  })
})

describe('recommendNextFeeding', () => {
  it('recommends feeding a counter starter ~12h after the last feed, keeping its ratio', () => {
    const ratio = { starter: 1, flour: 2, water: 2 }
    const result = recommendNextFeeding(
      { storage: 'counter', lastFedAt: null, createdAt: 0 },
      { fedAt: NOW, ratio },
    )

    expect(result.recommendedAt.getTime()).toBe(NOW + 12 * HOUR_MS)
    expect(result.ratio).toEqual(ratio)
    expect(result.reason.toLowerCase()).toContain('counter')
  })

  it('recommends feeding a fridge starter weekly with a maintenance ratio', () => {
    const result = recommendNextFeeding(
      { storage: 'fridge', lastFedAt: null, createdAt: 0 },
      { fedAt: NOW, ratio: { starter: 1, flour: 5, water: 5 } },
    )

    expect(result.recommendedAt.getTime()).toBe(NOW + 7 * 24 * HOUR_MS)
    expect(result.ratio).toEqual(MAINTENANCE_RATIO)
    expect(result.reason.toLowerCase()).toContain('fridge')
  })

  it('falls back to the starter lastFedAt when no feeding record is passed', () => {
    const result = recommendNextFeeding({ storage: 'counter', lastFedAt: NOW, createdAt: 0 }, null)

    expect(result.recommendedAt.getTime()).toBe(NOW + 12 * HOUR_MS)
    expect(result.ratio).toEqual(MAINTENANCE_RATIO)
  })

  it('falls back to the starter createdAt when there is no feeding history at all', () => {
    const result = recommendNextFeeding({ storage: 'counter', lastFedAt: null, createdAt: NOW }, null)

    expect(result.recommendedAt.getTime()).toBe(NOW + 12 * HOUR_MS)
  })
})

describe('describeStarterStatus', () => {
  it('flags a starter with no feedings yet', () => {
    const result = describeStarterStatus(null, NOW)
    expect(result.tone).toBe('attention')
    expect(result.label.toLowerCase()).toContain('feed')
  })

  it('reports "rising" well before the estimated peak window', () => {
    const result = describeStarterStatus(
      { fedAt: NOW - 1 * HOUR_MS, ratio: { starter: 1, flour: 1, water: 1 }, ambientTempC: 24, peakedAt: null },
      NOW,
    )
    expect(result).toEqual({ label: 'Fed 1h ago — rising', tone: 'healthy' })
  })

  it('reports "likely peaking soon" once inside the approach buffer or window', () => {
    const result = describeStarterStatus(
      { fedAt: NOW - 3 * HOUR_MS, ratio: { starter: 1, flour: 1, water: 1 }, ambientTempC: 24, peakedAt: null },
      NOW,
    )
    expect(result).toEqual({ label: 'Fed 3h ago — likely peaking soon', tone: 'healthy' })
  })

  it('reports "hungry" once well past the estimated window without being marked peaked', () => {
    const result = describeStarterStatus(
      { fedAt: NOW - 20 * HOUR_MS, ratio: { starter: 1, flour: 1, water: 1 }, ambientTempC: 24, peakedAt: null },
      NOW,
    )
    expect(result).toEqual({ label: 'Hungry — feed before use', tone: 'attention' })
  })

  it('reports "ready to use" shortly after a confirmed peak', () => {
    const result = describeStarterStatus(
      {
        fedAt: NOW - 5 * HOUR_MS,
        ratio: { starter: 1, flour: 1, water: 1 },
        ambientTempC: 24,
        peakedAt: NOW - 2 * HOUR_MS,
      },
      NOW,
    )
    expect(result).toEqual({ label: 'Peaked 2h ago — ready to use', tone: 'healthy' })
  })

  it('reports "hungry" once well past a confirmed peak', () => {
    const result = describeStarterStatus(
      {
        fedAt: NOW - 15 * HOUR_MS,
        ratio: { starter: 1, flour: 1, water: 1 },
        ambientTempC: 24,
        peakedAt: NOW - 10 * HOUR_MS,
      },
      NOW,
    )
    expect(result).toEqual({ label: 'Hungry — feed before use', tone: 'attention' })
  })
})
