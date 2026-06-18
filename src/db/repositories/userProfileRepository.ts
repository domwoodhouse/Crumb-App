import { db, type CrumbDB } from '../db'
import type { Equipment, HydrationComfort, SkillLevel, UserProfile } from '../types'

// UserProfile is a single record per device, always stored under this key.
export const USER_PROFILE_ID = 'singleton'

export interface UpsertUserProfileInput {
  skillLevel: SkillLevel
  availableFlours: string[]
  hydrationComfort: HydrationComfort
  equipment: Equipment[]
  defaultAmbientTempC: number
}

export type UpdateUserProfileInput = Partial<Omit<UserProfile, 'id'>>

export function createUserProfileRepository(database: CrumbDB) {
  return {
    async get(): Promise<UserProfile | undefined> {
      return database.userProfiles.get(USER_PROFILE_ID)
    },

    // Creates the profile if it doesn't exist yet, otherwise fully replaces it.
    async upsert(input: UpsertUserProfileInput): Promise<UserProfile> {
      const profile: UserProfile = { id: USER_PROFILE_ID, ...input }
      await database.userProfiles.put(profile)
      return profile
    },

    async update(changes: UpdateUserProfileInput): Promise<void> {
      await database.userProfiles.update(USER_PROFILE_ID, changes)
    },

    async remove(): Promise<void> {
      await database.userProfiles.delete(USER_PROFILE_ID)
    },
  }
}

export const userProfileRepository = createUserProfileRepository(db)
