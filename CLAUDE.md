# Crumb

Local-first sourdough and bread planning app. No backend, no accounts — all data lives in
the browser via IndexedDB. See [SPEC.md](./SPEC.md) for the product spec.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (`@import "tailwindcss"` in `src/index.css`, no separate config file needed)
- Dexie for IndexedDB persistence
- React Router for client-side routing
- Vitest + Testing Library for unit tests
- vite-plugin-pwa for offline support / installability

## Commands

```
npm run dev        # start dev server
npm run build       # type-check (tsc -b) then production build
npm run preview    # preview the production build locally
npm run test        # run the test suite once
npm run test:watch  # run tests in watch mode
```

## Architecture

The codebase is layered so business logic stays testable and independent of React and the
database:

```
src/
  domain/        pure business logic — no React, no Dexie, no DOM. Functions take typed
                 inputs and return typed outputs. This is what most unit tests target.
  db/            Dexie schema (db.ts) + one repository per feature. Repositories are the
                 only code that touches db.table(...) directly — features call repositories,
                 never Dexie itself.
  features/      one folder per feature (starter, recipes, plan, home). Each folder owns its
                 page component(s), feature-specific hooks, and any feature-local UI. Feature
                 code may import from domain/, db/, and components/, but features do not
                 import from each other.
  components/    shared, feature-agnostic UI (buttons, inputs, cards). Anything used by only
                 one feature belongs in that feature's folder instead.
  app/            routing (App.tsx), shared layout (Layout.tsx), and the bottom nav shell.
```

Dependency direction is one-way: `app -> features -> (domain, db, components)`. `domain` and
`db` never import from `features` or `app`.

## Conventions

- Functional components and hooks only — no class components.
- Type everything explicitly at module boundaries (component props, function signatures,
  repository return types). Prefer `interface` for object shapes, `type` for unions/aliases.
- Business logic is pure functions in `src/domain`. Components call domain functions and
  render the result; they don't reimplement calculations inline. This is what makes the
  fermentation/timing/scheduling math unit-testable without rendering anything.
- Persistence only happens through `src/db` repositories. Components and domain code never
  import `dexie` or `db.ts` directly — domain logic takes plain data in and returns plain
  data out, and a feature's hook or page wires that to a repository.
- One repository file per feature table, named `<feature>Repository.ts`.
- Co-locate tests with source as `*.test.ts` / `*.test.tsx` next to the file under test.
- Tailwind utility classes for styling; avoid ad-hoc CSS files per component.
- Prefer named exports over default exports.
