# Contributing to UrbanFlow

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
npm test -w apps/frontend   # Vitest
npm test -w apps/backend    # Jest
```

## Pull Request flow
1. Work on your worktree branch
2. Team Lead reviews & merges to main
3. Deploy via Coolify
