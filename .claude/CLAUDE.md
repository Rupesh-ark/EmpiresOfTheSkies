# Empires of the Skies — Project Context

## What This Is
A multiplayer strategy board game — digital adaptation of a physical board game (rules in `rulesets/`). Players control kingdoms, manage resources, fight aerial/ground battles, run elections, handle events, and compete for victory points across a hex world map. Currently migrating from v3.6 to v4.2 rules.

## Architecture
- **Monorepo** (pnpm workspaces): `packages/game/` (shared logic), `empires_of_the_skies/` (React frontend), `server/` (boardgame.io backend)
- **Single source of truth**: all game rules live in `packages/game/` — both client and server import from here
- **Server-authoritative**: boardgame.io validates moves server-side; clients get state via WebSocket sync
- **Deployment**: frontend → Vercel, backend → Render

## Tech Stack
- TypeScript throughout, React + Vite + MUI + Emotion (frontend), boardgame.io + Koa (server)
- Testing: Vitest (`cd packages/game && npx vitest run`)
- Package manager: pnpm

## Key Commands
- `pnpm install` — install dependencies
- `pnpm build:all` — build all packages
- `pnpm dev:server` — run backend on :8000
- `pnpm dev:app` — run frontend on :5173
- `cd packages/game && npx vitest run` — run game logic tests
- **After every code change, run BOTH tests AND build.** Vitest does NOT type-check (it transpiles only). A file can pass tests but fail `pnpm build:all` due to type errors (e.g., invalid string literals in union types). Always verify both.

## Game Flow (Phase Order)
discovery → actions → aerial_battle → ground_battle → plunder_legends → conquest → election → resolution → reset → events → (next round starts at discovery)

## Conventions
- Moves receive `{ G, ctx, playerID }` and mutate G in place (Immer under the hood)
- Return `INVALID_MOVE` for invalid actions — never silently corrupt state
- Use `validateMove()` for counsellor/gold pre-checks
- Use `logEvent()` for game log entries
- Test with `buildInitialG()`, `buildPlayer()`, `callMove()` from testHelpers.ts
- Types in `packages/game/src/types.ts` — always use them, never `any`

## How We Work

### Compact early to prevent instruction drift
Run `/compact` at 40-50% context usage (check with `/context`). When context gets full, Claude forgets the teaching and gating rules first. If you notice teaching or quizzes stopping, that's the signal to compact immediately. After compacting, re-read `.claude/rules/teaching.md` to reload the conventions.

### Keep the developer engaged during agent work
**TIMING: Print the thinking task BEFORE calling the agent.** Output order: (1) thinking task text, (2) agent call. If the agent call comes first, the task appears after work is done.
When the agent returns, ask about the thinking task BEFORE presenting results. Keep tasks small enough to complete in under 5 minutes.

### Never run agents in parallel
Always run one subagent at a time, sequentially. Wait for it to complete, teach, quiz, and get developer approval before starting the next one.

### The developer is learning — always teach
The developer is actively learning this codebase. Every agent MUST explain what it's doing and why, provide before/after context, and quiz the developer to verify understanding. Never just silently make changes.

### Nothing starts without approval
All commands use gated workflows. The developer must explicitly approve at every stage. Do not proceed past a gate without the developer's say-so.

### Delegation pattern
Use Opus for brainstorming hard problems. Delegate implementation to Sonnet subagents via `.claude/agents/`. Always write a self-contained spec before delegating — subagents have no context from your conversation.

## Agents (all run on Sonnet, all teach inline)
- `game-logic-implementer` — moves, phases, helpers, state changes (packages/game + server)
- `frontend-implementer` — UI components, dialogs, styling (empires_of_the_skies)
- `qa-tester` — vitest tests, edge case verification (test files only)
- `perf-debugger` — debugging, performance, cross-cutting issues (full access)
- `teacher` — deep-dive system explanations (read-only, use before work for complex topics)

## Commands
- `/brainstorm` — Opus architect mode: understand → design → spec → delegate → teach & review
- `/brainstorm-sub` — Sonnet fast mode: clarify → spec → delegate → teach & review
- `/resume` — pick up unfinished work from previous sessions
- `/rule-audit` — forensic rule-by-rule audit comparing codebase against v4.2 rules