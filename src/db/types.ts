// Entity types for Crumb's storage layer. Timestamps are epoch milliseconds (Date.now()).
// This file has no Dexie or React imports — it's plain data shapes.

export type StarterStorage = 'counter' | 'fridge'

export interface Starter {
  id: string
  name: string
  flourType: string
  hydrationPercent: number
  storage: StarterStorage
  createdAt: number
  lastFedAt: number | null
  lastPeakAt: number | null
}

export interface FeedingRatio {
  starter: number
  flour: number
  water: number
}

export type RiseObservation = 'doubled' | 'tripled' | 'barely' | 'fell'

export interface Feeding {
  id: string
  starterId: string
  fedAt: number
  ratio: FeedingRatio
  flourType: string
  ambientTempC: number
  peakedAt: number | null
  riseObservation: RiseObservation | null
  notes: string
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type HydrationComfort = 'low' | 'medium' | 'high'
export type Equipment = 'dutch-oven' | 'banneton' | 'loaf-tin' | 'oven-only'

// UserProfile is a singleton table — always stored under USER_PROFILE_ID (see
// userProfileRepository.ts).
export interface UserProfile {
  id: string
  skillLevel: SkillLevel
  availableFlours: string[]
  hydrationComfort: HydrationComfort
  equipment: Equipment[]
  defaultAmbientTempC: number
}

export type RecipeDifficulty = SkillLevel

export interface RecipeFlourComponent {
  type: string
  percent: number
}

// Defined fully in the timing engine phase. Kept as a typed placeholder so Recipe.steps
// has a stable shape to compile against until then.
export interface ScheduleStepTemplate {
  id: string
  name: string
}

export interface Recipe {
  id: string
  name: string
  description: string
  difficulty: RecipeDifficulty
  baseHydrationPercent: number
  flours: RecipeFlourComponent[]
  saltPercent: number
  starterPercent: number
  requiredEquipment: Equipment[]
  steps: ScheduleStepTemplate[]
}

export type BakeStatus = 'planned' | 'in-progress' | 'done'

// Defined fully in the timing engine / reverse scheduling phase.
export interface ScheduledStep {
  id: string
  name: string
}

export interface Bake {
  id: string
  recipeId: string
  createdAt: number
  targetReadyAt: number | null
  plannedStartAt: number | null
  ambientTempC: number
  timeline: ScheduledStep[]
  status: BakeStatus
}
