import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from '../db'
import { createId } from '../id'
import { createStarterRepository } from './starterRepository'

describe('starterRepository', () => {
  let database: CrumbDB
  let repo: ReturnType<typeof createStarterRepository>

  beforeEach(() => {
    database = new CrumbDB(`test-starter-${createId()}`)
    repo = createStarterRepository(database)
  })

  it('creates a starter with defaulted createdAt and null fed/peak timestamps', async () => {
    const starter = await repo.create({
      name: 'Doughy',
      flourType: 'white',
      hydrationPercent: 100,
      storage: 'counter',
    })

    expect(starter.id).toBeTruthy()
    expect(starter.name).toBe('Doughy')
    expect(starter.lastFedAt).toBeNull()
    expect(starter.lastPeakAt).toBeNull()
    expect(typeof starter.createdAt).toBe('number')
  })

  it('reads a starter by id', async () => {
    const created = await repo.create({
      name: 'Doughy',
      flourType: 'rye',
      hydrationPercent: 80,
      storage: 'fridge',
    })

    const found = await repo.getById(created.id)
    expect(found).toEqual(created)
  })

  it('returns undefined for a missing id', async () => {
    const found = await repo.getById('does-not-exist')
    expect(found).toBeUndefined()
  })

  it('lists all starters ordered by createdAt', async () => {
    const first = await repo.create({ name: 'A', flourType: 'white', hydrationPercent: 100, storage: 'counter' })
    const second = await repo.create({ name: 'B', flourType: 'white', hydrationPercent: 100, storage: 'counter' })
    // Force distinct createdAt values so ordering is deterministic regardless of how fast
    // the two creates above ran.
    await repo.update(first.id, { createdAt: 1000 })
    await repo.update(second.id, { createdAt: 2000 })

    const all = await repo.getAll()
    expect(all.map((s) => s.id)).toEqual([first.id, second.id])
  })

  it('updates a starter', async () => {
    const created = await repo.create({
      name: 'Doughy',
      flourType: 'white',
      hydrationPercent: 100,
      storage: 'counter',
    })

    await repo.update(created.id, { storage: 'fridge', lastFedAt: 12345 })

    const updated = await repo.getById(created.id)
    expect(updated?.storage).toBe('fridge')
    expect(updated?.lastFedAt).toBe(12345)
  })

  it('deletes a starter', async () => {
    const created = await repo.create({
      name: 'Doughy',
      flourType: 'white',
      hydrationPercent: 100,
      storage: 'counter',
    })

    await repo.remove(created.id)

    expect(await repo.getById(created.id)).toBeUndefined()
  })
})
