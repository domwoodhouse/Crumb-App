Dexie schema (`db.ts`, entity types in `types.ts`) and one repository per table in
`repositories/`. A repository wraps a Dexie table with typed CRUD functions so features
never call `db.table(...)` or import Dexie directly.

Each repository file exports:
- a factory, `createXRepository(database: CrumbDB)`, returning the bound CRUD/query
  methods — this is what lets tests build a repository against an isolated, throwaway
  `CrumbDB` instance instead of the shared app database
- a singleton, `xRepository`, built from that factory against the app-wide `db` export —
  this is what feature code imports

`seed.ts` inserts demo data (one starter, the user profile, a few recipes) and is
idempotent, so it's safe to call on every app start — it only writes to tables that are
currently empty.

Tests live next to each repository as `*.test.ts` and use `fake-indexeddb` to run real
Dexie/IndexedDB operations under Vitest's jsdom environment, each against a uniquely-named
`CrumbDB` instance so tests never see each other's data.
