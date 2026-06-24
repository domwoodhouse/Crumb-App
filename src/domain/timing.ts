// Fermentation timing engine for Crumb.
//
// Everything in this file is a baker's heuristic, not lab-precise fermentation science.
// The constants below are named and exported specifically so they're easy to find and
// recalibrate later (Phase 8) once there's real logged-bake data to tune against — treat
// every number here as a reasonable starting guess, not a guarantee.

import { MINUTE_MS } from './time'

export type StepKind = 'prep' | 'ferment' | 'shape' | 'rest' | 'bake' | 'cool'

export type StarterActivity = 'sluggish' | 'normal' | 'very-active'

// --- Recipe-level step definition ---------------------------------------------

export interface ScheduleStepTemplate {
  id: string
  name: string
  kind: StepKind
  // Whether this step's duration depends on temperature/starter activity (ferment steps)
  // or is roughly fixed regardless of conditions (prep/shape/rest/bake/cool).
  tempDependent: boolean
  // Whether the user may choose to run this step as a cold retard instead of at ambient
  // temperature. Only meaningful when tempDependent is true.
  retardable: boolean
  // Required when tempDependent is true: this step's duration at REFERENCE_TEMP_C with
  // 'normal' starter activity, before temperature/activity/retard scaling.
  referenceDurationMin?: number
  // Required when tempDependent is false: a roughly fixed duration regardless of conditions.
  fixedDurationMin?: number
  notes?: string
}

// --- Concrete, computed step -----------------------------------------------------

export interface ScheduledStepInputs {
  ambientTempC: number
  starterActivity: StarterActivity
  // Whether THIS step specifically ran as a cold retard (only possible if the template is
  // retardable and the caller asked for it).
  retarded: boolean
}

export interface ScheduledStep {
  id: string
  name: string
  kind: StepKind
  startAt: number
  endAt: number
  durationMin: number
  inputs: ScheduledStepInputs
}

export interface BakeConditions {
  ambientTempC: number
  starterActivity: StarterActivity
  // ids of steps the user has chosen to cold-retard. Ignored for steps that aren't
  // retardable: true on their template.
  retardStepIds?: string[]
}

// --- Temperature / activity model ------------------------------------------------
//
// Actual duration = referenceDuration * Q10^((referenceTempC - actualTempC) / 10), scaled by
// a starter-activity multiplier. Q10 ≈ 2 means fermentation rate roughly doubles every
// +10°C and halves every -10°C — colder is longer, warmer is shorter.

export const REFERENCE_TEMP_C = 24 // ~75°F
export const FERMENT_Q10 = 2

export const STARTER_ACTIVITY_MULTIPLIER: Record<StarterActivity, number> = {
  sluggish: 1.3,
  normal: 1.0,
  'very-active': 0.8,
}

export const RETARD_TEMP_C = 4 // typical fridge temperature

// Sanity clamps so the model can't produce absurd numbers at extreme inputs. A retarded
// step gets its own (tighter, realistic) range since near-freezing fermentation doesn't
// follow the same Q10 curve as room-temperature fermentation — the clamp compensates for
// the model rather than trying to extend Q10 down to fridge temperatures.
export const RETARD_MIN_MIN = 8 * 60 // 8h
export const RETARD_MAX_MIN = 16 * 60 // 16h
export const FERMENT_MIN_MIN = 30 // 30 minutes
export const FERMENT_MAX_MIN = 24 * 60 // 24h

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface ComputeStepDurationOptions {
  ambientTempC: number
  starterActivity: StarterActivity
  useRetard: boolean
}

// Pure: returns the step's duration in minutes for the given conditions. Does not mutate
// or depend on anything but its arguments.
export function computeStepDuration(template: ScheduleStepTemplate, options: ComputeStepDurationOptions): number {
  if (!template.tempDependent) {
    if (template.fixedDurationMin === undefined) {
      throw new Error(`Step "${template.name}" is not temperature-dependent but has no fixedDurationMin`)
    }
    return template.fixedDurationMin
  }

  if (template.referenceDurationMin === undefined) {
    throw new Error(`Step "${template.name}" is temperature-dependent but has no referenceDurationMin`)
  }

  const retarding = options.useRetard && template.retardable
  const effectiveTempC = retarding ? RETARD_TEMP_C : options.ambientTempC

  const temperatureMultiplier = FERMENT_Q10 ** ((REFERENCE_TEMP_C - effectiveTempC) / 10)
  const activityMultiplier = STARTER_ACTIVITY_MULTIPLIER[options.starterActivity]

  const rawDurationMin = template.referenceDurationMin * temperatureMultiplier * activityMultiplier

  return retarding
    ? clamp(rawDurationMin, RETARD_MIN_MIN, RETARD_MAX_MIN)
    : clamp(rawDurationMin, FERMENT_MIN_MIN, FERMENT_MAX_MIN)
}

function isRetarded(template: ScheduleStepTemplate, conditions: BakeConditions): boolean {
  return template.retardable && (conditions.retardStepIds?.includes(template.id) ?? false)
}

function scheduleStepDurations(steps: ScheduleStepTemplate[], conditions: BakeConditions): number[] {
  return steps.map((template) =>
    computeStepDuration(template, {
      ambientTempC: conditions.ambientTempC,
      starterActivity: conditions.starterActivity,
      useRetard: isRetarded(template, conditions),
    }),
  )
}

// --- Timelines --------------------------------------------------------------------

// "If I start now": lays steps out end-to-end starting at startAt.
export function buildForwardTimeline(
  steps: ScheduleStepTemplate[],
  startAt: number,
  conditions: BakeConditions,
): ScheduledStep[] {
  const durationsMin = scheduleStepDurations(steps, conditions)

  let cursor = startAt
  return steps.map((template, index) => {
    const durationMin = durationsMin[index]
    const stepStartAt = cursor
    const stepEndAt = stepStartAt + durationMin * MINUTE_MS
    cursor = stepEndAt

    return {
      id: template.id,
      name: template.name,
      kind: template.kind,
      startAt: stepStartAt,
      endAt: stepEndAt,
      durationMin,
      inputs: {
        ambientTempC: conditions.ambientTempC,
        starterActivity: conditions.starterActivity,
        retarded: isRetarded(template, conditions),
      },
    }
  })
}

export interface ReverseTimelineResult {
  startAt: number
  steps: ScheduledStep[]
}

// "Ready by targetReadyAt": back-calculates the overall start time so the last step ends
// exactly at targetReadyAt, then lays out every step's start/end forward from there. Step
// durations don't depend on clock time, so this is just buildForwardTimeline run from a
// computed startAt — which is also what keeps forward/reverse consistent with each other.
export function buildReverseTimeline(
  steps: ScheduleStepTemplate[],
  targetReadyAt: number,
  conditions: BakeConditions,
): ReverseTimelineResult {
  const totalDurationMin = scheduleStepDurations(steps, conditions).reduce((sum, d) => sum + d, 0)
  const startAt = targetReadyAt - totalDurationMin * MINUTE_MS

  return { startAt, steps: buildForwardTimeline(steps, startAt, conditions) }
}
