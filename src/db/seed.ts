import { db, type CrumbDB } from './db'
import { createRecipeRepository, type CreateRecipeInput } from './repositories/recipeRepository'
import { createStarterRepository } from './repositories/starterRepository'
import { createUserProfileRepository } from './repositories/userProfileRepository'

const DEMO_RECIPES: CreateRecipeInput[] = [
  {
    name: 'Beginner White Sourdough',
    description: 'A forgiving everyday loaf — moderate hydration, baked in a Dutch oven.',
    difficulty: 'beginner',
    baseHydrationPercent: 75,
    flours: [{ type: 'white', percent: 100 }],
    saltPercent: 2,
    starterPercent: 20,
    requiredEquipment: ['dutch-oven', 'banneton'],
    steps: [],
  },
  {
    name: 'Whole Wheat Sandwich Loaf',
    description: 'A softer-crumb loaf baked in a tin, good for slicing.',
    difficulty: 'intermediate',
    baseHydrationPercent: 80,
    flours: [
      { type: 'whole-wheat', percent: 60 },
      { type: 'white', percent: 40 },
    ],
    saltPercent: 2,
    starterPercent: 15,
    requiredEquipment: ['loaf-tin'],
    steps: [],
  },
  {
    name: 'High-Hydration Country Loaf',
    description: 'An open, airy crumb that demands confident shaping at high hydration.',
    difficulty: 'advanced',
    baseHydrationPercent: 85,
    flours: [
      { type: 'white', percent: 90 },
      { type: 'rye', percent: 10 },
    ],
    saltPercent: 2.2,
    starterPercent: 20,
    requiredEquipment: ['dutch-oven', 'banneton'],
    steps: [],
  },
]

// Idempotent: only inserts demo data for tables that are currently empty, so it's safe to
// call on every app start without creating duplicates.
export async function seedDemoData(database: CrumbDB = db): Promise<void> {
  const starters = createStarterRepository(database)
  const profiles = createUserProfileRepository(database)
  const recipes = createRecipeRepository(database)

  if ((await starters.getAll()).length === 0) {
    await starters.create({
      name: 'Doughy',
      flourType: 'white',
      hydrationPercent: 100,
      storage: 'counter',
    })
  }

  if ((await profiles.get()) === undefined) {
    await profiles.upsert({
      skillLevel: 'beginner',
      availableFlours: ['white', 'whole-wheat'],
      hydrationComfort: 'medium',
      equipment: ['dutch-oven', 'banneton'],
      defaultAmbientTempC: 21,
    })
  }

  if ((await recipes.getAll()).length === 0) {
    for (const recipe of DEMO_RECIPES) {
      await recipes.create(recipe)
    }
  }
}
