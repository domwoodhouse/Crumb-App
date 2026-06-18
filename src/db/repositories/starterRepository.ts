import { db, type CrumbDB } from '../db'
import { createId } from '../id'
import type { Starter, StarterStorage } from '../types'

export interface CreateStarterInput {
  name: string
  flourType: string
  hydrationPercent: number
  storage: StarterStorage
}

export type UpdateStarterInput = Partial<Omit<Starter, 'id'>>

export function createStarterRepository(database: CrumbDB) {
  return {
    async create(input: CreateStarterInput): Promise<Starter> {
      const starter: Starter = {
        id: createId(),
        name: input.name,
        flourType: input.flourType,
        hydrationPercent: input.hydrationPercent,
        storage: input.storage,
        createdAt: Date.now(),
        lastFedAt: null,
        lastPeakAt: null,
      }
      await database.starters.add(starter)
      return starter
    },

    async getById(id: string): Promise<Starter | undefined> {
      return database.starters.get(id)
    },

    async getAll(): Promise<Starter[]> {
      return database.starters.orderBy('createdAt').toArray()
    },

    async update(id: string, changes: UpdateStarterInput): Promise<void> {
      await database.starters.update(id, changes)
    },

    async remove(id: string): Promise<void> {
      await database.starters.delete(id)
    },
  }
}

export const starterRepository = createStarterRepository(db)
