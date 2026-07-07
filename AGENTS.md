# Agent Guide — Empires of the Skies

Quick orientation for AI coding agents working on this repo.

---

## What This Project Is

A digital adaptation of a 6-player fantasy board game. Full-stack multiplayer web app with a shared game engine, React frontend, and boardgame.io/Koa backend. Also includes a game-playing AI system used for balance testing and self-play tournaments.

---

## Package Layout

```
EmpiresOfTheSkies/
  packages/game/            → @eots/game   (shared engine, types, moves, AI)
  empires_of_the_skies/     → React frontend (Vite, MUI, boardgame.io client)
  server/                   → Koa backend (boardgame.io server, PostgreSQL)
```

- `@eots/game` is consumed by both frontend and server.
- It builds to `dist/esm/`, `dist/cjs/`, and `dist/types/`.
- Build order matters: **game → server → frontend**.

---

## Common Commands

```bash
# Install everything
pnpm install

# Start local dev (run in separate terminals)
pnpm db:up               # PostgreSQL via Docker
pnpm dev:server          # http://localhost:8000
pnpm dev:app             # http://localhost:5173

# Build all packages
pnpm build:all

# Test the game engine
cd packages/game
pnpm test
pnpm test:watch
```

---

## Architecture Quick Reference

- **Game definition**: `packages/game/src/Game.ts`
- **Shared types**: `packages/game/src/types.ts`
- **Moves**: `packages/game/src/moves/` (grouped by phase)
- **Helpers / core logic**: `packages/game/src/helpers/`
- **AI**: `packages/game/src/ai/`
- **Tests**: `packages/game/src/__tests__/`
- **Frontend root**: `empires_of_the_skies/src/pages/Client.tsx`
- **Backend entry**: `server/src/server.ts`

The game is built on `boardgame.io`. State flows:

```
UI click → props.moves.*() → SocketIO → server validates & mutates G
→ broadcast → all clients re-render
```

---

## Important Conventions

- **Discriminated union for stage**: `GameStage` is `{ phase, sub }`. Always use `setStage()` and `isStage()` helpers from `helpers/stageUtils.ts`.
- **Moves**: every move is a `MoveDefinition` with `fn`, optional `validate`, `errorMessage`, and `successLog`. Register moves in `Game.ts` via `wrapMove()`.
- **Server-authoritative**: all rule logic lives in `@eots/game` and runs on the server. Never duplicate rules in the frontend.
- **TypeScript strictness**: prefer compile-time safety; illegal `GameStage` combinations should be type errors.
- **Loop guard**: `helpers/moveWrapper.ts` wraps moves; resolution has a turn-budget plugin that halts at 550 `endTurn`/`endPhase` calls per round.

---

## Gotchas

- `@eots/game` must be rebuilt after engine changes before server/frontend see them. `pnpm build:all` handles ordering, or run `pnpm dev:game` for watch mode during development.
- The backend is CJS (`"type": "commonjs"`); frontend is ESM.
- `pnpm-workspace.yaml` pins `is-generator-function@1.0.10` for Koa compatibility (droppable after the planned swap to the `@lean-poker/boardgame.io` fork, which removes koa-socket-2).
- AI tests under `packages/game/src/__tests__/ai/` can be slow; normal dev tests skip the full self-play smoke test.
- The `docs/` folder is NOT this project's documentation — it's local-only (gitignored) vendored material for the planned `@lean-poker/boardgame.io` fork swap. This project's architecture guide is the root `ARCHITECTURE.md`.
- Moves are defined once in `packages/game/src/moveDefinitions.ts` (implementation + validator) — `Game.ts` registers them from there via `wrapSet(...)`. To add a move: create the move file, add it to `MOVE_DEFINITIONS`, then list its name in the right `wrapSet` call(s) in `Game.ts`.

---

## Where to Find Rules

Original board game rules live in `rulesets/eots42.md` and `rulesets/eots42_amendments.md`. When game logic is unclear, check these first.

---

## License

Academic and research purposes only.
