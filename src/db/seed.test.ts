import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from './db'
import { createId } from './id'
import { createRecipeRepository } from './repositories/recipeRepository'
import { createStarterRepository } from './repositories/starterRepository'
import { createUserProfileRepository } from './repositories/userProfileRepository'
import { seedDemoData } from './seed'

describe('seedDemoData', () => {
  let database: CrumbDB

  beforeEach(() => {
    database = new CrumbDB(`test-seed-${createId()}`)
  })

  it('inserts one demo starter, a profile, and demo recipes', async () => {
    await seedDemoData(database)

    const starters = await createStarterRepository(database).getAll()
    const profile = await createUserProfileRepository(database).get()
    const recipes = await createRecipeRepository(database).getAll()

    expect(starters).toHaveLength(1)
    expect(profile).toBeDefined()
    expect(recipes.length).toBeGreaterThanOrEqual(2)
  })

  it('is idempotent — running it twice does not duplicate data', async () => {
    await seedDemoData(database)
    await seedDemoData(database)

    const starters = await createStarterRepository(database).getAll()
    const recipes = await createRecipeRepository(database).getAll()

    expect(starters).toHaveLength(1)
    expect(recipes).toHaveLength(3)
  })
})
