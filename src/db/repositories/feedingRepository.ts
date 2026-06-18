import { db, type CrumbDB } from '../db'
import { createId } from '../id'
import type { Feeding, FeedingRatio, RiseObservation } from '../types'

export interface CreateFeedingInput {
  starterId: string
  fedAt?: number
  ratio: FeedingRatio
  flourType: string
  ambientTempC: number
  notes?: string
}

export type UpdateFeedingInput = Partial<Omit<Feeding, 'id' | 'starterId'>>

export function createFeedingRepository(database: CrumbDB) {
  return {
    async create(input: CreateFeedingInput): Promise<Feeding> {
      const feeding: Feeding = {
        id: createId(),
        starterId: input.starterId,
        fedAt: input.fedAt ?? Date.now(),
        ratio: input.ratio,
        flourType: input.flourType,
        ambientTempC: input.ambientTempC,
        peakedAt: null,
        riseObservation: null,
        notes: input.notes ?? '',
      }
      await database.transaction('rw', database.feedings, database.starters, async () => {
        await database.feedings.add(feeding)
        await database.starters.update(feeding.starterId, { lastFedAt: feeding.fedAt })
      })
      return feeding
    },

    async getById(id: string): Promise<Feeding | undefined> {
      return database.feedings.get(id)
    },

    // Most recent feedings first.
    async getByStarter(starterId: string): Promise<Feeding[]> {
      const feedings = await database.feedings.where('starterId').equals(starterId).sortBy('fedAt')
      return feedings.reverse()
    },

    async update(id: string, changes: UpdateFeedingInput): Promise<void> {
      await database.feedings.update(id, changes)
    },

    // Marks a feeding as peaked and rolls that timestamp up to the starter's lastPeakAt.
    async markPeaked(
      id: string,
      peakedAt: number = Date.now(),
      riseObservation: RiseObservation | null = null,
    ): Promise<void> {
      const feeding = await database.feedings.get(id)
      if (!feeding) {
        throw new Error(`Feeding ${id} not found`)
      }
      await database.transaction('rw', database.feedings, database.starters, async () => {
        await database.feedings.update(id, { peakedAt, riseObservation })
        await database.starters.update(feeding.starterId, { lastPeakAt: peakedAt })
      })
    },

    async remove(id: string): Promise<void> {
      await database.feedings.delete(id)
    },
  }
}

export const feedingRepository = createFeedingRepository(db)
