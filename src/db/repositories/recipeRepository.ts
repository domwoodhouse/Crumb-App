import { db, type CrumbDB } from '../db'
import { createId } from '../id'
import type { Equipment, Recipe, RecipeDifficulty, RecipeFlourComponent, ScheduleStepTemplate } from '../types'

export interface CreateRecipeInput {
  name: string
  description: string
  difficulty: RecipeDifficulty
  baseHydrationPercent: number
  flours: RecipeFlourComponent[]
  saltPercent: number
  starterPercent: number
  requiredEquipment: Equipment[]
  steps?: ScheduleStepTemplate[]
}

export type UpdateRecipeInput = Partial<Omit<Recipe, 'id'>>

export function createRecipeRepository(database: CrumbDB) {
  return {
    async create(input: CreateRecipeInput): Promise<Recipe> {
      const recipe: Recipe = {
        id: createId(),
        name: input.name,
        description: input.description,
        difficulty: input.difficulty,
        baseHydrationPercent: input.baseHydrationPercent,
        flours: input.flours,
        saltPercent: input.saltPercent,
        starterPercent: input.starterPercent,
        requiredEquipment: input.requiredEquipment,
        steps: input.steps ?? [],
      }
      await database.recipes.add(recipe)
      return recipe
    },

    async getById(id: string): Promise<Recipe | undefined> {
      return database.recipes.get(id)
    },

    async getAll(): Promise<Recipe[]> {
      return database.recipes.orderBy('name').toArray()
    },

    async getByDifficulty(difficulty: RecipeDifficulty): Promise<Recipe[]> {
      return database.recipes.where('difficulty').equals(difficulty).toArray()
    },

    async update(id: string, changes: UpdateRecipeInput): Promise<void> {
      await database.recipes.update(id, changes)
    },

    async remove(id: string): Promise<void> {
      await database.recipes.delete(id)
    },
  }
}

export const recipeRepository = createRecipeRepository(db)
