import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from '../db'
import { createId } from '../id'
import { createBakeRepository } from './bakeRepository'

describe('bakeRepository', () => {
  let database: CrumbDB
  let repo: ReturnType<typeof createBakeRepository>
  const recipeId = 'recipe-1'

  beforeEach(() => {
    database = new CrumbDB(`test-bake-${createId()}`)
    repo = createBakeRepository(database)
  })

  it('creates a bake with sensible defaults', async () => {
    const bake = await repo.create({ recipeId, ambientTempC: 21 })

    expect(bake.status).toBe('planned')
    expect(bake.timeline).toEqual([])
    expect(bake.targetReadyAt).toBeNull()
    expect(bake.plannedStartAt).toBeNull()
    expect(typeof bake.createdAt).toBe('number')
  })

  it('reads a bake by id', async () => {
    const created = await repo.create({ recipeId, ambientTempC: 21 })
    expect(await repo.getById(created.id)).toEqual(created)
  })

  it('lists all bakes, most recent first', async () => {
    const first = await repo.create({ recipeId, ambientTempC: 21 })
    const second = await repo.create({ recipeId, ambientTempC: 21 })
    await repo.update(first.id, { createdAt: 1000 })
    await repo.update(second.id, { createdAt: 2000 })

    const all = await repo.getAll()
    expect(all.map((b) => b.id)).toEqual([second.id, first.id])
  })

  it('filters bakes by recipe', async () => {
    const matching = await repo.create({ recipeId, ambientTempC: 21 })
    await repo.create({ recipeId: 'other-recipe', ambientTempC: 21 })

    const result = await repo.getByRecipe(recipeId)
    expect(result.map((b) => b.id)).toEqual([matching.id])
  })

  it('filters bakes by status', async () => {
    const planned = await repo.create({ recipeId, ambientTempC: 21 })
    const done = await repo.create({ recipeId, ambientTempC: 21, status: 'done' })

    expect((await repo.getByStatus('planned')).map((b) => b.id)).toEqual([planned.id])
    expect((await repo.getByStatus('done')).map((b) => b.id)).toEqual([done.id])
  })

  it('updates bake status via updateStatus', async () => {
    const bake = await repo.create({ recipeId, ambientTempC: 21 })

    await repo.updateStatus(bake.id, 'in-progress')

    const updated = await repo.getById(bake.id)
    expect(updated?.status).toBe('in-progress')
  })

  it('updates arbitrary bake fields via update', async () => {
    const bake = await repo.create({ recipeId, ambientTempC: 21 })

    await repo.update(bake.id, { targetReadyAt: 8000 })

    const updated = await repo.getById(bake.id)
    expect(updated?.targetReadyAt).toBe(8000)
  })

  it('deletes a bake', async () => {
    const bake = await repo.create({ recipeId, ambientTempC: 21 })

    await repo.remove(bake.id)

    expect(await repo.getById(bake.id)).toBeUndefined()
  })
})
