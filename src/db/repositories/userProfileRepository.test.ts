import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CrumbDB } from '../db'
import { createId } from '../id'
import { createUserProfileRepository, USER_PROFILE_ID } from './userProfileRepository'

describe('userProfileRepository', () => {
  let database: CrumbDB
  let repo: ReturnType<typeof createUserProfileRepository>

  beforeEach(() => {
    database = new CrumbDB(`test-profile-${createId()}`)
    repo = createUserProfileRepository(database)
  })

  it('returns undefined before a profile is created', async () => {
    expect(await repo.get()).toBeUndefined()
  })

  it('creates the profile under the singleton id', async () => {
    const profile = await repo.upsert({
      skillLevel: 'beginner',
      availableFlours: ['white'],
      hydrationComfort: 'medium',
      equipment: ['dutch-oven'],
      defaultAmbientTempC: 21,
    })

    expect(profile.id).toBe(USER_PROFILE_ID)
    expect(await repo.get()).toEqual(profile)
  })

  it('upsert replaces the existing profile rather than creating a second record', async () => {
    await repo.upsert({
      skillLevel: 'beginner',
      availableFlours: ['white'],
      hydrationComfort: 'low',
      equipment: [],
      defaultAmbientTempC: 18,
    })
    await repo.upsert({
      skillLevel: 'advanced',
      availableFlours: ['white', 'rye'],
      hydrationComfort: 'high',
      equipment: ['dutch-oven', 'banneton'],
      defaultAmbientTempC: 24,
    })

    const profile = await repo.get()
    expect(profile?.skillLevel).toBe('advanced')
    expect(profile?.equipment).toEqual(['dutch-oven', 'banneton'])
  })

  it('partially updates the profile', async () => {
    await repo.upsert({
      skillLevel: 'beginner',
      availableFlours: ['white'],
      hydrationComfort: 'medium',
      equipment: [],
      defaultAmbientTempC: 21,
    })

    await repo.update({ defaultAmbientTempC: 25 })

    const profile = await repo.get()
    expect(profile?.defaultAmbientTempC).toBe(25)
    expect(profile?.skillLevel).toBe('beginner')
  })

  it('deletes the profile', async () => {
    await repo.upsert({
      skillLevel: 'beginner',
      availableFlours: ['white'],
      hydrationComfort: 'medium',
      equipment: [],
      defaultAmbientTempC: 21,
    })

    await repo.remove()

    expect(await repo.get()).toBeUndefined()
  })
})
