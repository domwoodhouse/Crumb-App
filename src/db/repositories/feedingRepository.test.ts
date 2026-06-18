import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from '../db'
import { createId } from '../id'
import { createFeedingRepository } from './feedingRepository'
import { createStarterRepository } from './starterRepository'

describe('feedingRepository', () => {
  let database: CrumbDB
  let feedings: ReturnType<typeof createFeedingRepository>
  let starters: ReturnType<typeof createStarterRepository>
  let starterId: string

  beforeEach(async () => {
    database = new CrumbDB(`test-feeding-${createId()}`)
    feedings = createFeedingRepository(database)
    starters = createStarterRepository(database)
    const starter = await starters.create({
      name: 'Doughy',
      flourType: 'white',
      hydrationPercent: 100,
      storage: 'counter',
    })
    starterId = starter.id
  })

  it('creates a feeding and updates the starter lastFedAt', async () => {
    const feeding = await feedings.create({
      starterId,
      fedAt: 5000,
      ratio: { starter: 1, flour: 5, water: 5 },
      flourType: 'white',
      ambientTempC: 21,
    })

    expect(feeding.peakedAt).toBeNull()
    expect(feeding.riseObservation).toBeNull()
    expect(feeding.notes).toBe('')

    const starter = await starters.getById(starterId)
    expect(starter?.lastFedAt).toBe(5000)
  })

  it('reads a feeding by id', async () => {
    const created = await feedings.create({
      starterId,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })

    expect(await feedings.getById(created.id)).toEqual(created)
  })

  it('returns feedings for a starter sorted by fedAt, most recent first', async () => {
    const older = await feedings.create({
      starterId,
      fedAt: 1000,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })
    const newer = await feedings.create({
      starterId,
      fedAt: 2000,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })

    const otherStarter = await starters.create({
      name: 'Other',
      flourType: 'rye',
      hydrationPercent: 100,
      storage: 'fridge',
    })
    await feedings.create({
      starterId: otherStarter.id,
      fedAt: 1500,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'rye',
      ambientTempC: 21,
    })

    const history = await feedings.getByStarter(starterId)
    expect(history.map((f) => f.id)).toEqual([newer.id, older.id])
  })

  it('marks a feeding peaked and rolls the timestamp up to the starter', async () => {
    const feeding = await feedings.create({
      starterId,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })

    await feedings.markPeaked(feeding.id, 9999, 'doubled')

    const updatedFeeding = await feedings.getById(feeding.id)
    expect(updatedFeeding?.peakedAt).toBe(9999)
    expect(updatedFeeding?.riseObservation).toBe('doubled')

    const starter = await starters.getById(starterId)
    expect(starter?.lastPeakAt).toBe(9999)
  })

  it('throws when marking a non-existent feeding as peaked', async () => {
    await expect(feedings.markPeaked('does-not-exist')).rejects.toThrow()
  })

  it('updates a feeding', async () => {
    const feeding = await feedings.create({
      starterId,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })

    await feedings.update(feeding.id, { notes: 'smelled tangy' })

    const updated = await feedings.getById(feeding.id)
    expect(updated?.notes).toBe('smelled tangy')
  })

  it('deletes a feeding', async () => {
    const feeding = await feedings.create({
      starterId,
      ratio: { starter: 1, flour: 1, water: 1 },
      flourType: 'white',
      ambientTempC: 21,
    })

    await feedings.remove(feeding.id)

    expect(await feedings.getById(feeding.id)).toBeUndefined()
  })
})
