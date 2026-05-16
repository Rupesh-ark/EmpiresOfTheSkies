# Empires of the Skies

A digital adaptation of a 6-player strategy board game set in a fantasy world where kingdoms race to discover new lands via skyships, fight aerial and ground battles, trade exotic goods, and compete for religious and political dominance.

Built as a full-stack multiplayer web application with a shared game engine, React frontend, and server-authoritative backend using boardgame.io.

Developed as part of a dissertation exploring digital board game implementation, multiplayer architecture, and game-playing AI.

---

## Live Demo

- **Frontend** — [empires-of-the-skies-tan.vercel.app](https://empires-of-the-skies-tan.vercel.app)

---

## Getting Started

**Prerequisites:** Node.js 22.x, pnpm (`npm install -g pnpm`), Docker

```bash
git clone <repository-url>
cd EmpiresOfTheSkies
pnpm install
pnpm db:up               # Start PostgreSQL in Docker
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
    game/                   Core game engine (@eots/game, shared by client + server)
      src/
        Game.ts             Main game definition — phases, turn order, hooks
        types.ts            All shared TypeScript types
        moves/              50+ move implementations grouped by phase
          actions/           Action board moves (recruit, build, trade, etc.)
          aerialBattle/      Fleet combat moves
          groundBattle/      Siege and garrison moves
          conquests/         Territory claiming
          election/          Archprelate voting
          events/            Event card resolution
          resolution/        End-of-round resolution flow
          plunderLegends/    Legend tile plunder
        helpers/             Game logic — battle math, map utils, resolution flow
        setup/               Initial state construction and card seeding
        data/                Tile definitions, game constants, card data
        ai/                  Bot system (see AI section below)
        __tests__/           Unit and integration tests (Vitest)
  empires_of_the_skies/     React frontend (Vite, MUI)
    src/
      pages/                HomePage, LobbyPage, RulesPage, Client (game board)
      components/           UI organised by game system:
        WorldMap/            8x4 discovery map with tile reveal
        ActionBoard/         Counsellor placement board
        AerialBattle/        Fleet combat dialogs
        GroundBattle/        Siege resolution
        Election/            Archprelate voting UI
        Events/              Event card selection
        PlayerBoard/         Kingdom status panel
        Cards/               FoW, KA, and Legacy card displays
        Trade/               Deal proposal interface
        Resolution/          End-of-round dialogs
        ...
  server/                   boardgame.io backend (Koa, PostgreSQL)
  rulesets/                 Original board game rulebook (markdown)
```

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Material UI, Emotion |
| Backend | Node.js 22, boardgame.io, Koa, PostgreSQL |
| Game Engine | boardgame.io (shared package, compiled to CJS + ESM) |
| Multiplayer | boardgame.io server sync, @boardgame.io/p2p |
| AI Tuning | Python, CMA-ES, Matplotlib |
| Monorepo | pnpm workspaces |
| Hosting | Vercel (frontend), VPS via Docker (backend) |
| Testing | Vitest |

---

## Game Overview

Six kingdoms compete over a variable number of rounds. Each round follows this phase sequence:

```
Events -> Discovery -> Taxes -> Actions -> Resolution -> Scoring -> Reset
```

**Discovery** — Players flip tiles on an 8x4 map to reveal new lands (Dwarves, Elves, Humans, Magical creatures, Legendary locations). Each tile has resources, combat values, and directional blocking that shapes exploration routes.

**Actions** — Players place counsellors on a shared action board to recruit troops, purchase skyships, found buildings (outposts, colonies, forts, cathedrals, palaces, shipyards, factories), influence prelates, manage heresy, dispatch fleets, trade goods, and negotiate deals with other players.

**Resolution** — Aerial battles between fleets, ground sieges at contested tiles, conquest of unoccupied discoveries, Archprelate elections (religious VP), infidel fleet attacks, rebellions, and grand army invasions all resolve in a fixed sequence.

**Economy** — Six tradeable goods (mithril, dragon scales, kraken skin, magic dust, sticky ichor, pipeweed) with a fluctuating price market. Income from taxes, colonies, trade routes, and factories. Piracy mechanics. Debt is allowed.

**Religion** — A heresy/orthodoxy track per kingdom (-9 to +9). Players can convert their monarch, punish dissenters, influence other kingdoms' prelates, and compete for Archprelate (elected leader of the church, worth VP each round). Event cards trigger religious upheaval.

**Victory** — VP from territory, buildings, military strength, the Archprelate title, legacy cards, and end-game bonuses. Highest VP after the final round wins.

---

## Game-Playing AI

The bot system lets up to 6 AI players run a complete game with no human input. It powers balance testing, self-play tournaments, and mixed human/bot matches.

**Architecture:**
- `EmpiresBot` — top-level class that routes decisions to phase-specific evaluators
- `enumerate.ts` — generates all legal moves for the current game state
- Phase evaluators score each legal move based on game context:
  - `ActionsEvaluator` — action board decisions
  - `DiscoveryEvaluator` — tile flip choices
  - `EventsEvaluator` — event card selection
  - `ResolutionEvaluator` — battles, elections, conquests, rebellions

**MCTS** — For the action phase, a Monte Carlo Tree Search layer runs simulations over the evaluator scores to pick moves that account for future consequences, not just immediate value.

**Personality system** — Each bot derives a personality from its dealt Kingdom Advantage and Legacy cards. The archetype system maps card combinations to quality weights (territory focus, economy focus, military aggression, religious influence, etc.), so bots with different cards play differently.

**Tuning pipeline:**
- `selfPlay.ts` — runs headless games locally via boardgame.io's Local client
- `tournament.ts` — A/B testing, hill climbing, and round-robin league formats
- `cma_tuner.py` — CMA-ES (Covariance Matrix Adaptation) optimiser that tunes evaluator weights across batches of self-play games
- `GameRecorder` — captures per-decision snapshots for post-game analysis

---

## Running Tests

```bash
cd packages/game
pnpm test           # run all tests
pnpm test:watch     # watch mode
```

---

## Design Decisions

- **Shared game package** — a single `@eots/game` library used by both client and server ensures rules are never duplicated or out of sync.
- **Discriminated union for game stage** — `GameStage` encodes the current phase and sub-phase as a type-safe union, making illegal state transitions a compile-time error.
- **Server-authoritative multiplayer** — all game state lives on the server; clients send moves and receive validated state updates.
- **Resolution sequencer** — a central module (`resolutionSequencer.ts`) owns the entire end-of-round transition graph (aerial -> plunder -> ground -> conquest -> election -> post-election), replacing scattered callback chains.
- **Seeded card distribution** — `manufacturedFunSeed.ts` implements rivalry-aware dealing for Kingdom Advantage and Legacy cards so that every game has meaningful strategic counters at the table.

---

## License

This project is for academic and research purposes.
