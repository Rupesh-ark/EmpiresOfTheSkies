# Empires of the Skies

A digital adaptation of a 2–6 player strategy board game set in a fantasy age of exploration, where kingdoms race to discover new lands by skyship, fight aerial and ground battles, run trade monopolies, and contest control of the Church.

Built as a full-stack multiplayer web application: one shared TypeScript rules engine consumed by both a React client and a server-authoritative boardgame.io backend, plus a self-playing AI capable of running complete games unattended.

Developed as part of a dissertation on digital board game implementation, multiplayer architecture, and game-playing AI.

---

## Live Demo

- **Play** — [empiresofthesky.com](https://empiresofthesky.com)

---

## Getting Started

**Prerequisites:** Node.js 22.x, pnpm (`npm install -g pnpm`), Docker

```bash
git clone <repository-url>
cd EmpiresOfTheSkies
pnpm install
pnpm db:up               # PostgreSQL in Docker
```

Run the backend and frontend in separate terminals:

```bash
pnpm dev:server          # http://localhost:8000 (tsx watch)
pnpm dev:app             # http://localhost:5173 (Vite HMR)
```

Build everything for production:

```bash
pnpm build:all
```

---

## Project Structure

```
EmpiresOfTheSkies/
  packages/
    game/                   Core rules engine (@eots/game — shared by client + server)
      src/
        Game.ts             Game definition: 19 phases, turn order, hooks
        types.ts            Shared TypeScript types
        moves/              50+ move implementations, grouped by phase
        helpers/            Battle maths, map utils, within-phase sequencing
        setup/              Initial state and card seeding
        data/               Tile definitions, constants, card data
        ai/                 Bot system (see below)
        __tests__/          Unit + integration tests (Vitest)
  empires_of_the_skies/     React client (Vite, MUI)
    src/
      pages/                Home, Lobby, Rules, AI Tuner, Client (the game board)
      components/
        layout/              The stable frame — TopStrip, OpponentRail, PromptBar, GameLayout
        WorldMap/            8×4 discovery map, fleet deployment, trade-route overlay
        ActionBoard/         Shared counsellor-placement board
        PlayerBoard/         Your dock — hand, fleets, shipyards, musters
        AerialBattle/        Fleet combat
        GroundBattle/        Sieges and garrisons
        Conquests/           Territory claiming
        Election/            Archprelate voting
        Events/              Event cards and rebellions
        Trade/               Goods market, routes, piracy intent
        Stats/ Chat/ Cards/  Reference panels and card displays
        atoms/               Shared primitives (DecisionPanel, SectionHeader, GameButton…)
      theme/                Design tokens, presets, materials
  server/                   boardgame.io backend (Koa, PostgreSQL)
  rulesets/                 Original board game rulebook (markdown)
```

A deeper walkthrough — tracing any flow from UI click to state change and back — lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Material UI, Emotion |
| Backend | Node.js 22, boardgame.io, Koa, PostgreSQL |
| Game Engine | boardgame.io (shared ESM package) |
| Multiplayer | boardgame.io server sync over SocketIO |
| AI Tuning | Python, CMA-ES, Matplotlib |
| Monorepo | pnpm workspaces |
| Hosting | Self-hosted: Docker images on GHCR, home server behind Cloudflare Tunnel |
| Testing | Vitest |

---

## Game Overview

Kingdoms compete over six rounds. Every round runs the same rulebook sequence, and each step below is a real engine phase rather than a sub-state:

```
events → discovery → taxes → actions
       → rebellions → aerialBattles → plunder → groundBattles → conquests
       → trade → sellGoods → piracy → factoryIncome
       → election → invasionCheck → retrieveFleets
       → scoring → reset
```

**Discovery** — Flip tiles on an 8×4 map to reveal lands, peoples and legends. Each tile carries resources, combat values, and mountain edges that block movement and trade chains, so the map shapes where expansion is even possible. The map wraps horizontally.

**Actions** — The heart of the game, and where most of the skill sits. Players place counsellors on a shared, contested action board to recruit troops, buy skyships, found buildings, influence prelates, punish dissenters and convert their monarch. Counsellors cap how many actions a kingdom takes per round, and each extra counsellor in the same row costs more — so the board is a competition for cheap access, not just a menu.

**Resolution** — Battles, plunder, conquest, trade, piracy, factory income, the Archprelate election, invasion checks and fleet retrieval all resolve in fixed rulebook order.

**Economy** — Six tradeable goods (mithril, dragon scales, kraken skin, magic dust, sticky ichor, pipeweed) on price tracks that fall as supply enters play. Income comes from taxes, claims, trade routes and factories. Routes are physical chains of skyships running from a claimed Land back to Faithdom, and rivals can tax or sever them. Debt is legal and costs VP.

**Religion** — A heresy/orthodoxy track per kingdom (−9 to +9). Convert your monarch, punish dissenters, sway rival prelates, and contest the Archprelacy — worth VP and the power to bless or curse.

**Victory** — VP from territory, buildings, military standing, the Archprelate title, secret legacy cards and end-game bonuses. Most VP after the final round wins.

---

## Interface

The in-game frame is fixed: nothing appears, disappears or resizes during play, and nothing is ever allowed to cover the map.

- **Top strip** — round, the phase track, whose turn, and the shared heresy gauge.
- **Left rail** — standings only. One plate per kingdom with its enamel pin; clicking one opens that kingdom in the panel.
- **Map** — permanently centred. Trade routes draw as chains, so a route severed by piracy visibly fails to reach Faithdom.
- **Right column** — one panel region. The contested action board by default; a live decision, or Log / Stats / Trade / kingdom inspection, take the same slot.
- **Prompt bar** — what the game is waiting on, your treasury, and the commit controls.
- **Dock** — your player board: hand, fleets, shipyards and musters, each action sitting beside what it produces.

Two rules run through it. **Material encodes role** — leather is frame, parchment is content. **Slots show capacity** — five berths to a fleet, four Fortunes to a hand, three shipyards to a kingdom; absence is information.

---

## Game-Playing AI

Up to six bots can play a complete game with no human input, which powers balance testing, self-play tournaments and mixed human/bot matches.

**Architecture**
- `EmpiresBot` — routes each decision to a phase-specific evaluator
- `enumerate.ts` — generates the legal moves for the current state
- Evaluators score those moves in context: `ActionsEvaluator`, `DiscoveryEvaluator`, `EventsEvaluator`, `ResolutionEvaluator`

**MCTS** — the actions phase runs a Monte Carlo Tree Search over evaluator scores, so placements account for future consequences rather than immediate value alone.

**Personality** — each bot derives an archetype from its dealt Kingdom Advantage and Legacy cards, mapping card combinations to quality weights (territory, economy, military, religion). Different cards produce genuinely different play.

**Tuning pipeline**
- `selfPlay.ts` — headless games via boardgame.io's Local client
- `tournament.ts` — A/B testing, hill climbing and round-robin leagues
- `ai/tuner/cma_tuner.py` — CMA-ES optimiser tuning evaluator weights across batches of self-play games
- `GameRecorder` — per-decision snapshots for post-game analysis

---

## Running Tests

```bash
cd packages/game
pnpm test           # 140 tests across 22 files
pnpm test:watch
```

---

## Design Decisions

- **One shared game package.** `@eots/game` is consumed by client and server alike, so a rule cannot drift between them. Where the UI needs a derived value the engine already computes — a fleet's combat strength, an action's cost — it imports the engine's function rather than reimplementing the maths.
- **One clock.** Every step of a round is a real boardgame.io phase. An earlier design carried a `G.stage` discriminated union alongside the phase, which meant two sources of truth for "where are we" and a walker that had to keep them agreed; deleting it removed a whole class of desync bug. `resolutionSequencer.ts` now handles only within-phase ordering, such as which battle at a contested tile resolves next.
- **Server-authoritative multiplayer.** All state lives on the server; clients send moves and receive validated state.
- **Seeded card distribution.** `manufacturedFunSeed.ts` deals Kingdom Advantage and Legacy cards with rivalry awareness, so every game has meaningful counters at the table rather than a hand of unopposed strategies.
- **The frame never moves.** Layout is not a function of phase or whose turn it is. Content swaps inside fixed regions, which keeps the board readable while other kingdoms commit.

---

## Contributing

For agent/AI coding instructions, conventions and common commands, see [`AGENTS.md`](./AGENTS.md).

---

## License

This project is for academic and research purposes.
