import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from '../db'
import { createId } from '../id'
import { createRecipeRepository, type CreateRecipeInput } from './recipeRepository'

const BASE_INPUT: CreateRecipeInput = {
  name: 'Beginner White Sourdough',
  description: 'A forgiving everyday loaf.',
  difficulty: 'beginner',
  baseHydrationPercent: 75,
  flours: [{ type: 'white', percent: 100 }],
  saltPercent: 2,
  starterPercent: 20,
  requiredEquipment: ['dutch-oven'],
}

describe('recipeRepository', () => {
  let database: CrumbDB
  let repo: ReturnType<typeof createRecipeRepository>

  beforeEach(() => {
    database = new CrumbDB(`test-recipe-${createId()}`)
    repo = createRecipeRepository(database)
  })

  it('creates a recipe and defaults steps to an empty array', async () => {
    const recipe = await repo.create(BASE_INPUT)

    expect(recipe.id).toBeTruthy()
    expect(recipe.steps).toEqual([])
    expect(recipe.flours).toEqual([{ type: 'white', percent: 100 }])
  })

  it('reads a recipe by id', async () => {
    const created = await repo.create(BASE_INPUT)
    expect(await repo.getById(created.id)).toEqual(created)
  })

  it('lists all recipes ordered by name', async () => {
    await repo.create({ ...BASE_INPUT, name: 'Zucchini Bread' })
    await repo.create({ ...BASE_INPUT, name: 'Apple Loaf' })

    const all = await repo.getAll()
    expect(all.map((r) => r.name)).toEqual(['Apple Loaf', 'Zucchini Bread'])
  })

  it('filters recipes by difficulty', async () => {
    await repo.create({ ...BASE_INPUT, name: 'Beginner Loaf', difficulty: 'beginner' })
    await repo.create({ ...BASE_INPUT, name: 'Advanced Loaf', difficulty: 'advanced' })

    const advanced = await repo.getByDifficulty('advanced')
    expect(advanced.map((r) => r.name)).toEqual(['Advanced Loaf'])
  })

  it('updates a recipe', async () => {
    const created = await repo.create(BASE_INPUT)

    await repo.update(created.id, { saltPercent: 2.5 })

    const updated = await repo.getById(created.id)
    expect(updated?.saltPercent).toBe(2.5)
  })

  it('deletes a recipe', async () => {
    const created = await repo.create(BASE_INPUT)

    await repo.remove(created.id)

    expect(await repo.getById(created.id)).toBeUndefined()
  })
})
