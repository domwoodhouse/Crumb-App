import { db, type CrumbDB } from '../db'
import { createId } from '../id'
import type { Bake, BakeStatus, ScheduledStep } from '../types'

export interface CreateBakeInput {
  recipeId: string
  targetReadyAt?: number | null
  plannedStartAt?: number | null
  ambientTempC: number
  timeline?: ScheduledStep[]
  status?: BakeStatus
}

export type UpdateBakeInput = Partial<Omit<Bake, 'id'>>

export function createBakeRepository(database: CrumbDB) {
  return {
    async create(input: CreateBakeInput): Promise<Bake> {
      const bake: Bake = {
        id: createId(),
        recipeId: input.recipeId,
        createdAt: Date.now(),
        targetReadyAt: input.targetReadyAt ?? null,
        plannedStartAt: input.plannedStartAt ?? null,
        ambientTempC: input.ambientTempC,
        timeline: input.timeline ?? [],
        status: input.status ?? 'planned',
      }
      await database.bakes.add(bake)
      return bake
    },

    async getById(id: string): Promise<Bake | undefined> {
      return database.bakes.get(id)
    },

    // Most recent bakes first.
    async getAll(): Promise<Bake[]> {
      const bakes = await database.bakes.orderBy('createdAt').toArray()
      return bakes.reverse()
    },

    async getByRecipe(recipeId: string): Promise<Bake[]> {
      const bakes = await database.bakes.where('recipeId').equals(recipeId).sortBy('createdAt')
      return bakes.reverse()
    },

    async getByStatus(status: BakeStatus): Promise<Bake[]> {
      return database.bakes.where('status').equals(status).toArray()
    },

    async update(id: string, changes: UpdateBakeInput): Promise<void> {
      await database.bakes.update(id, changes)
    },

    async updateStatus(id: string, status: BakeStatus): Promise<void> {
      await database.bakes.update(id, { status })
    },

    async remove(id: string): Promise<void> {
      await database.bakes.delete(id)
    },
  }
}

export const bakeRepository = createBakeRepository(db)
