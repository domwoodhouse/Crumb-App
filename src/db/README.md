Dexie schema (`db.ts`) and per-feature repositories. A repository wraps a Dexie table with
typed CRUD functions so features never call `db.table(...)` directly. Add one file per
feature, e.g. `feedingsRepository.ts`, as that feature's tables are added to `db.ts`.
