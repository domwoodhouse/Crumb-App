import Dexie, { type EntityTable } from 'dexie'
import type { Bake, Feeding, Recipe, Starter, UserProfile } from './types'

export class CrumbDB extends Dexie {
  starters!: EntityTable<Starter, 'id'>
  feedings!: EntityTable<Feeding, 'id'>
  userProfiles!: EntityTable<UserProfile, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  bakes!: EntityTable<Bake, 'id'>

  constructor(name = 'crumb') {
    super(name)
    this.version(1).stores({
      starters: 'id, name, storage, createdAt',
      feedings: 'id, starterId, fedAt, peakedAt',
      userProfiles: 'id',
      recipes: 'id, name, difficulty',
      bakes: 'id, recipeId, status, createdAt',
    })
  }
}

// App-wide singleton. Tests construct their own CrumbDB(name) instance instead of using
// this, so they stay isolated from each other and from the real "crumb" database.
export const db = new CrumbDB()
