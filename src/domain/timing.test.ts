import { describe, expect, it } from 'vitest'
import { HOUR_MS, MINUTE_MS } from './time'
import {
  buildForwardTimeline,
  buildReverseTimeline,
  computeStepDuration,
  FERMENT_MAX_MIN,
  FERMENT_Q10,
  REFERENCE_TEMP_C,
  RETARD_MAX_MIN,
  RETARD_MIN_MIN,
  type BakeConditions,
  type ScheduleStepTemplate,
} from './timing'

const NOW = 1_700_000_000_000

// A representative ~7-step sourdough plan: mix -> bulk ferment -> bench rest -> shape ->
// final proof (optionally retarded overnight) -> bake -> cool.
const STANDARD_STEPS: ScheduleStepTemplate[] = [
  { id: 'mix', name: 'Mix', kind: 'prep', tempDependent: false, retardable: false, fixedDurationMin: 15 },
  {
    id: 'bulk',
    name: 'Bulk ferment',
    kind: 'ferment',
    tempDependent: true,
    retardable: false,
    referenceDurationMin: 240,
  },
  { id: 'bench-rest', name: 'Bench rest', kind: 'rest', tempDependent: false, retardable: false, fixedDurationMin: 20 },
  { id: 'shape', name: 'Shape', kind: 'shape', tempDependent: false, retardable: false, fixedDurationMin: 10 },
  {
    id: 'final-proof',
    name: 'Final proof',
    kind: 'ferment',
    tempDependent: true,
    retardable: true,
    referenceDurationMin: 90,
  },
  { id: 'bake', name: 'Bake', kind: 'bake', tempDependent: false, retardable: false, fixedDurationMin: 45 },
  { id: 'cool', name: 'Cool', kind: 'cool', tempDependent: false, retardable: false, fixedDurationMin: 60 },
]

const BULK_TEMPLATE = STANDARD_STEPS[1]
const FINAL_PROOF_TEMPLATE = STANDARD_STEPS[4]
const MIX_TEMPLATE = STANDARD_STEPS[0]

function baseConditions(overrides: Partial<BakeConditions> = {}): BakeConditions {
  return { ambientTempC: REFERENCE_TEMP_C, starterActivity: 'normal', ...overrides }
}

describe('computeStepDuration', () => {
  it('returns the fixed duration for non-temp-dependent steps, ignoring temp/activity/retard', () => {
    const duration = computeStepDuration(MIX_TEMPLATE, {
      ambientTempC: -10,
      starterActivity: 'very-active',
      useRetard: true,
    })
    expect(duration).toBe(15)
  })

  it('matches the reference duration exactly at the reference temperature with normal activity', () => {
    const duration = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'normal',
      useRetard: false,
    })
    expect(duration).toBe(240)
  })

  it('lengthens fermentation when colder than the reference temperature', () => {
    const at18 = computeStepDuration(BULK_TEMPLATE, { ambientTempC: 18, starterActivity: 'normal', useRetard: false })
    const at24 = computeStepDuration(BULK_TEMPLATE, { ambientTempC: 24, starterActivity: 'normal', useRetard: false })
    expect(at18).toBeGreaterThan(at24)
    expect(at18).toBeCloseTo(240 * FERMENT_Q10 ** ((REFERENCE_TEMP_C - 18) / 10), 6)
  })

  it('shortens fermentation when warmer than the reference temperature', () => {
    const at28 = computeStepDuration(BULK_TEMPLATE, { ambientTempC: 28, starterActivity: 'normal', useRetard: false })
    const at24 = computeStepDuration(BULK_TEMPLATE, { ambientTempC: 24, starterActivity: 'normal', useRetard: false })
    expect(at28).toBeLessThan(at24)
    expect(at28).toBeCloseTo(240 * FERMENT_Q10 ** ((REFERENCE_TEMP_C - 28) / 10), 6)
  })

  it('is monotonically decreasing as temperature rises', () => {
    const temps = [10, 14, 18, 22, 24, 26, 30, 34]
    const durations = temps.map((t) =>
      computeStepDuration(BULK_TEMPLATE, { ambientTempC: t, starterActivity: 'normal', useRetard: false }),
    )
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i]).toBeLessThan(durations[i - 1])
    }
  })

  it('applies the starter activity multiplier on top of the temperature scaling', () => {
    const sluggish = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'sluggish',
      useRetard: false,
    })
    const normal = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'normal',
      useRetard: false,
    })
    const veryActive = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'very-active',
      useRetard: false,
    })

    expect(sluggish).toBe(312) // 240 * 1.3
    expect(normal).toBe(240) // 240 * 1.0
    expect(veryActive).toBe(192) // 240 * 0.8
  })

  it('ignores useRetard for a step that is not flagged retardable', () => {
    const retardRequested = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'normal',
      useRetard: true,
    })
    const noRetard = computeStepDuration(BULK_TEMPLATE, {
      ambientTempC: REFERENCE_TEMP_C,
      starterActivity: 'normal',
      useRetard: false,
    })
    expect(BULK_TEMPLATE.retardable).toBe(false)
    expect(retardRequested).toBe(noRetard)
  })

  it('throws for a temp-dependent template missing referenceDurationMin', () => {
    const broken: ScheduleStepTemplate = { id: 'x', name: 'Broken', kind: 'ferment', tempDependent: true, retardable: false }
    expect(() =>
      computeStepDuration(broken, { ambientTempC: 24, starterActivity: 'normal', useRetard: false }),
    ).toThrow()
  })

  it('throws for a fixed-duration template missing fixedDurationMin', () => {
    const broken: ScheduleStepTemplate = { id: 'x', name: 'Broken', kind: 'prep', tempDependent: false, retardable: false }
    expect(() =>
      computeStepDuration(broken, { ambientTempC: 24, starterActivity: 'normal', useRetard: false }),
    ).toThrow()
  })

  describe('cold retard clamping', () => {
    it('clamps up to the retard minimum when the naive Q10 result would be too short', () => {
      // Final proof: 90 * Q10^((24-4)/10) = 90 * 4 = 360min raw, below the 8h floor.
      const duration = computeStepDuration(FINAL_PROOF_TEMPLATE, {
        ambientTempC: 24,
        starterActivity: 'normal',
        useRetard: true,
      })
      expect(duration).toBe(RETARD_MIN_MIN)
    })

    it('clamps down to the retard maximum when the naive Q10 result would be too long', () => {
      const longProof: ScheduleStepTemplate = {
        id: 'long-proof',
        name: 'Long final proof',
        kind: 'ferment',
        tempDependent: true,
        retardable: true,
        referenceDurationMin: 400,
      }
      // 400 * 4 = 1600min raw, above the 16h ceiling.
      const duration = computeStepDuration(longProof, { ambientTempC: 24, starterActivity: 'normal', useRetard: true })
      expect(duration).toBe(RETARD_MAX_MIN)
    })

    it('stays within [RETARD_MIN_MIN, RETARD_MAX_MIN] across starter activity levels', () => {
      for (const starterActivity of ['sluggish', 'normal', 'very-active'] as const) {
        const duration = computeStepDuration(FINAL_PROOF_TEMPLATE, { ambientTempC: 24, starterActivity, useRetard: true })
        expect(duration).toBeGreaterThanOrEqual(RETARD_MIN_MIN)
        expect(duration).toBeLessThanOrEqual(RETARD_MAX_MIN)
      }
    })
  })

  describe('general ferment clamping (non-retard)', () => {
    it('clamps an absurdly long duration at extreme cold to FERMENT_MAX_MIN', () => {
      const duration = computeStepDuration(BULK_TEMPLATE, { ambientTempC: -5, starterActivity: 'normal', useRetard: false })
      // Unclamped this would be ~1791 minutes (~30h) — clearly not a usable estimate.
      expect(duration).toBe(FERMENT_MAX_MIN)
    })
  })
})

describe('buildForwardTimeline', () => {
  it('lays out a standard plan end-to-end with a sensible same-day total at the reference temperature', () => {
    const conditions = baseConditions()
    const timeline = buildForwardTimeline(STANDARD_STEPS, NOW, conditions)

    expect(timeline).toHaveLength(STANDARD_STEPS.length)
    const total = timeline[timeline.length - 1].endAt - timeline[0].startAt
    // 15 + 240 + 20 + 10 + 90 + 45 + 60 = 480 minutes exactly at 24°C/normal/no retard.
    expect(total).toBe(480 * MINUTE_MS)
    expect(total).toBeGreaterThan(6 * HOUR_MS)
    expect(total).toBeLessThan(10 * HOUR_MS)
  })

  it('produces a roughly one-day total once the final proof is retarded overnight', () => {
    const conditions = baseConditions({ retardStepIds: ['final-proof'] })
    const timeline = buildForwardTimeline(STANDARD_STEPS, NOW, conditions)

    const total = timeline[timeline.length - 1].endAt - timeline[0].startAt
    // 15 + 240 + 20 + 10 + 480(clamped retard) + 45 + 60 = 870 minutes = 14.5h.
    expect(total).toBe(870 * MINUTE_MS)
    expect(total).toBeGreaterThan(12 * HOUR_MS)
    expect(total).toBeLessThan(24 * HOUR_MS)

    const finalProof = timeline.find((s) => s.id === 'final-proof')!
    expect(finalProof.inputs.retarded).toBe(true)
    expect(finalProof.durationMin).toBe(RETARD_MIN_MIN)
  })

  it('chains each step starting exactly when the previous one ends', () => {
    const timeline = buildForwardTimeline(STANDARD_STEPS, NOW, baseConditions())

    expect(timeline[0].startAt).toBe(NOW)
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].startAt).toBe(timeline[i - 1].endAt)
    }
    for (const step of timeline) {
      expect(step.endAt - step.startAt).toBe(step.durationMin * MINUTE_MS)
    }
  })

  it('only marks the requested, retardable step as retarded', () => {
    const timeline = buildForwardTimeline(STANDARD_STEPS, NOW, baseConditions({ retardStepIds: ['final-proof', 'bulk'] }))

    const bulk = timeline.find((s) => s.id === 'bulk')!
    const finalProof = timeline.find((s) => s.id === 'final-proof')!
    // 'bulk' is not retardable, so requesting it has no effect even though its id was listed.
    expect(bulk.inputs.retarded).toBe(false)
    expect(finalProof.inputs.retarded).toBe(true)
  })

  it('defaults to no retarding when retardStepIds is omitted', () => {
    const timeline = buildForwardTimeline(STANDARD_STEPS, NOW, baseConditions())
    expect(timeline.every((s) => !s.inputs.retarded)).toBe(true)
  })
})

describe('buildReverseTimeline', () => {
  it('ends the last step exactly at targetReadyAt', () => {
    const targetReadyAt = NOW + 24 * HOUR_MS
    const { steps } = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, baseConditions())

    expect(steps[steps.length - 1].endAt).toBe(targetReadyAt)
  })

  it('chains steps backward consistently and returns the resulting overall startAt', () => {
    const targetReadyAt = NOW + 24 * HOUR_MS
    const { startAt, steps } = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, baseConditions())

    expect(steps[0].startAt).toBe(startAt)
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].startAt).toBe(steps[i - 1].endAt)
    }
    for (const step of steps) {
      expect(step.endAt - step.startAt).toBe(step.durationMin * MINUTE_MS)
    }
  })

  it('pushes the start time earlier when the final proof is retarded overnight', () => {
    const targetReadyAt = NOW + 24 * HOUR_MS
    const withoutRetard = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, baseConditions())
    const withRetard = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, baseConditions({ retardStepIds: ['final-proof'] }))

    expect(withRetard.startAt).toBeLessThan(withoutRetard.startAt)
  })
})

describe('forward/reverse round-trip consistency', () => {
  it('reverse-scheduling the end time produced by a forward timeline reproduces the same timeline', () => {
    const conditions = baseConditions({ ambientTempC: 19, starterActivity: 'sluggish', retardStepIds: ['final-proof'] })
    const forward = buildForwardTimeline(STANDARD_STEPS, NOW, conditions)
    const targetReadyAt = forward[forward.length - 1].endAt

    const reverse = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, conditions)

    // Per-step durations come from the same pure computeStepDuration call in both
    // directions, so they're bit-identical. Only the cumulative clock times can differ by
    // sub-millisecond float rounding (summing per-step ms vs. multiplying a single total),
    // so those get a tolerant (well under 1ms-meaningful) comparison instead of toBe.
    expect(reverse.startAt).toBeCloseTo(NOW, -2) // within 50ms
    expect(reverse.steps).toHaveLength(forward.length)
    for (let i = 0; i < forward.length; i++) {
      expect(reverse.steps[i].id).toBe(forward[i].id)
      expect(reverse.steps[i].durationMin).toBe(forward[i].durationMin)
      expect(reverse.steps[i].startAt).toBeCloseTo(forward[i].startAt, -2)
      expect(reverse.steps[i].endAt).toBeCloseTo(forward[i].endAt, -2)
    }
  })

  it('round-trips for a no-retard, single-condition plan with exact millisecond equality', () => {
    const conditions = baseConditions()
    const forward = buildForwardTimeline(STANDARD_STEPS, NOW, conditions)
    const targetReadyAt = forward[forward.length - 1].endAt

    const reverse = buildReverseTimeline(STANDARD_STEPS, targetReadyAt, conditions)

    expect(reverse.startAt).toBe(NOW)
    expect(reverse.steps.map((s) => [s.startAt, s.endAt])).toEqual(forward.map((s) => [s.startAt, s.endAt]))
  })
})
