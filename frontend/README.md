# Frontend

React + Vite + TypeScript frontend for the AutoWashingCar project.

## Structure

- `src/main.tsx` - app bootstrap
- `src/App.tsx` - route entry
- `src/routes/` - route definitions
- `src/layouts/` - shared layouts
- `src/pages/` - page-level screens
- `src/services/` - API/service helpers

## Requirements

- Node.js 16+
- npm

## Setup

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev
# or
npm start
```

## Build and preview

```bash
npm run build
npm run preview
```

## Quality checks

```bash
npm run lint
npm run lint:fix
npm run typecheck
npm run check
```

## Formatting

```bash
npm run format
```

## Environment

- Copy `.env.local.example` to `.env.local` for local overrides.
- Variables starting with `VITE_` are available in client code through `import.meta.env`.
- Dev server proxy for `/api` is configured in `vite.config.ts`.

## Pre-commit

Husky + lint-staged run on staged files before commit.

```bash
npm run prepare
```

## Notes for SWP

Keep page components thin and move domain logic into features/services/hooks as the app grows.
