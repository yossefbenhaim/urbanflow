# Contributing to Silver Castle

## Branch Strategy
- `main` — stable, production-ready
- `feat/frontend` — frontend agent worktree
- `feat/backend` — backend agent worktree
- `feat/review` — reviewer agent worktree

## Commit Format
`type(scope): description`
Types: feat, fix, chore, test, docs, refactor

## Code Standards
- TypeScript strict mode — no `any`
- Hebrew UI labels on all user-facing text
- RTL direction on all components
- Mobile-first responsive design

## Testing
```bash
# Run all tests
npm test

# Run frontend tests only
npm test -w apps/frontend

# Run backend tests only
npm test -w apps/backend

# Run tests in watch mode
npm test -w apps/frontend -- --watch
```

Both frontend and backend use **Vitest**.

- Frontend: 142 tests (components, utils, templates)
- Backend: 198 tests (routers, middleware, validation)

## Build
```bash
# Full build (shared → frontend → backend)
npm run build

# TypeScript check only (no emit)
cd apps/frontend && npx tsc --noEmit
cd apps/backend && npx tsc --noEmit
```

## CI
GitHub Actions runs on every push/PR to `main`:
1. TypeScript type check (frontend + backend)
2. All tests (frontend + backend)
3. Full production build

## Pull Request flow
1. Work on your worktree branch
2. Ensure CI passes (tests + build + type check)
3. Team Lead reviews & merges to main
4. Deploy via Coolify
