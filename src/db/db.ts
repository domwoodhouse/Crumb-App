import Dexie from 'dexie'

// Feature tables are added here as they're built, e.g.:
// feedings!: EntityTable<Feeding, 'id'>
export class CrumbDB extends Dexie {
  constructor() {
    super('crumb')
    this.version(1).stores({})
  }
}

export const db = new CrumbDB()
