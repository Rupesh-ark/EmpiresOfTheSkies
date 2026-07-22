# Empires of the Skies — Architecture Guide

A walkthrough of how everything connects, written so anyone can trace any flow from UI click to state change and back.

---

## The Three Packages

This is a pnpm monorepo with three packages:

```
packages/game/          →  @eots/game    (the game engine —> rules, moves, AI, types)
empires_of_the_skies/   →  React frontend (Vite, MUI, boardgame.io client)
server/                 →  Koa backend   (boardgame.io server, PostgreSQL)
```

`@eots/game` is the shared library. It compiles once as ESM, with TypeScript declarations in the same `dist/` tree. Both the frontend and server consume that output.

**Build order matters**: game engine first, then server and frontend.

```bash
pnpm build:all    # runs: @eots/game build → server build → frontend build
```

The game engine build is defined in `packages/game/package.json`:
```
build  →  tsc -p tsconfig.build.json  →  dist/
```

---

## How a Game Starts

### 1. Server boots (`server/src/server.ts`)

```typescript
const db = new PostgresStore(process.env.DATABASE_URL);

const server = Server({
  games: [MyGame],
  origins: allowOrigin,
  db,
});
server.run(PORT, () => log.info(`Server running on port ${PORT}`));
```

That's it. boardgame.io handles match creation, player joining, move validation, and state sync over SocketIO.

### 2. Player creates/joins a match (`LobbyPage.tsx`)

The lobby uses boardgame.io's `LobbyClient` to talk to the server REST API:
- `lobbyClient.createMatch()` → creates a match, returns a matchID
- `lobbyClient.joinMatch()` → joins with a playerName, returns credentials
- Session is saved to localStorage as `eots_{matchID}_{playerName}` with `{ playerID, credentials }`

The lobby polls `lobbyClient.getMatch()` to show who's joined. When all seats are filled, the game starts.

### 3. Game board connects (`Client.tsx`)

```typescript
const GameClient = Client({
  game: MyGame,
  board: ActionBoardsAndMap,     // the root game UI component
  multiplayer: SocketIO({ server }),
  debug: false,
});

<GameClient playerID={playerID} matchID={matchID} credentials={credentials} />
```

boardgame.io's `Client()` wires everything: it connects to the server via SocketIO, subscribes to state changes, and passes `{ G, ctx, moves, playerID, isActive, lastActionError }` as props to the `board` component.

### 4. Bot clients connect (`setupBotClients.ts`)

For each bot player, a separate boardgame.io `Client()` is created with its own SocketIO connection and credentials. Each client subscribes to state changes:

```typescript
botClient.subscribe((state) => {
  if (isMyTurn || isActivePlayer) {
    if (bot.isThinking()) return;      
    bot.setThinking(true);
    setTimeout(() => {
      const move = bot.chooseMove(state.G, state.ctx, playerID);
      botClient.moves[move.move](...move.args);
      bot.setThinking(false);
    }, 1500 + Math.random() * 1000);    // 1.5-2.5s delay
  }
});
```

The subscription fires on every state change from the server. The `isThinking` guard prevents overlapping decisions. The delay gives natural pacing.

---

## The Game Definition (`Game.ts`)

This is the heart of the project. It defines everything boardgame.io needs: setup, phases, moves, turn order, and hooks.

### Setup (lines ~221–333)

Creates the initial `MyGameState` (`G`):
- `mapState` — the 8×4 tile grid, discovered tiles, buildings, battle map, goods prices, route skyships
- `playerInfo` — one entry per player with resources, fleets, heresy, buildings, cards
- `boardState` — the shared action board (counsellor placement slots)
- `cardDecks` — fortune of war, kingdom advantage, legacy, event card pools
- `stage` — starts at `{ phase: "setup", sub: "kingdom_advantage" }`

### Phase Sequence

The engine's phase chain mirrors the rulebook exactly — one boardgame.io phase per
rulebook step. A round is 18 phases:

```
setup (once) → events → discovery → taxes → actions
  → rebellions → aerialBattles → plunder → groundBattles → conquests   ┐
  → trade → sellGoods → piracy → factoryIncome                         │ "Resolution"
  → election → invasionCheck → retrieveFleets                          ┘ (umbrella)
  → scoring → reset → events → ...
```

The twelve phases bracketed above are the rulebook's Phase 5 ("Resolution
Sequence") and are grouped under one "Resolution" label in the UI via
`phaseGroup(ctx.phase)`. The ordered list lives in `data/resolutionSequence.ts`,
and `__tests__/integration/rulebookOrder.test.ts` asserts the engine chain
matches it — rulebook drift is a test failure, not a code review hope.

Each phase is defined in `src/phases/` (one file each, plus the inline
setup/events/discovery/taxes/actions/reset definitions in `Game.ts`) with:
- `onBegin` — scan for this phase's work; if none, `events.endPhase()` (empty
  phases self-skip; automatic phases like taxes/trade/scoring do their work
  here and always end)
- `turn.order.first` — computes who acts from `G` (the sanctioned mechanism for
  phase-entry routing; `endTurn` is illegal inside `onBegin`)
- `moves` — the framework-enforced legal move set for the phase
- `next` — the following phase

**Key phases:**

**events** — Each player picks an event card. Battle-flavored events queue
deferred work that the rebellions/groundBattles phases consume later.

**discovery** — Players flip undiscovered tiles or pass. Ends when all pass.

**actions** — The main phase. Players alternate placing counsellors on the
shared action board: deploy fleets, found buildings, recruit, influence
prelates, deals, etc. Ends when everyone passes.

**rebellions → … → retrieveFleets** — the resolution umbrella. Battle phases
scan the map for work (deferred event battles resolve first in groundBattles,
per the rulebook); trade/sellGoods/piracy/factoryIncome are automatic economy
slices; election and invasionCheck route interactive sub-steps to the right
players; retrieveFleets lets players bring fleets home.

**scoring** — the rulebook's Phase 6: agitator shifts, trade-gains VP, heresy
VP, palace VP, debt penalty, and (final round) legacy scoring + `endGame`.

**reset** — Recomputes turn order from the action-board slots, round summary.

### Move Registration 

Move implementations and validators are stored once in `MOVE_DEFINITIONS`. Each phase registers the names it permits:

```typescript
moves: wrapSet("discoverTile", "pass")
```

`wrapMove()` (from `helpers/moveWrapper.ts`) adds:
- Server-authoritative validation
- Structured rejection and success logging
- Player-visible success log entries
- Move recording for analytics

### Turn Budget Plugin 

A custom boardgame.io plugin that counts `endTurn()` and `endPhase()` calls per round (reset in discovery's `onBegin`). Past 550 it stops forwarding the calls, freezing rather than corrupting a runaway game. It is the engine's single backstop — the phase structure itself is the real loop protection, enforced by the conformance tests.

---

## How Moves Flow

### From UI to State

1. Player clicks a button in the UI (e.g. "Deploy Fleet")
2. Component calls `props.moves.deployFleet(fleetIdx, destination, skyships, regiments, levies, elites)`
3. boardgame.io client sends this to the server over SocketIO
4. Server validates the move and runs it if valid
5. A rejection is rolled back and returned only to the acting client as `lastActionError`
6. A success is broadcast to all clients as the new authoritative `G`
7. Relevant clients re-render

### Move Structure

Each move file exports a `MoveDefinition`:

```typescript
const deployFleet: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    // validate, mutate G, call events.endTurn() if needed
  },
  validate: (G, playerID, ...args) => MoveError | null,
  errorMessage: "Cannot dispatch fleet right now",
  successLog: (G, pid, ...args) => "Angland dispatches fleet to [5,0]",
};
```

- `fn` — the actual logic. Receives the game context and move arguments.
- `validate` — optional server-side check. Returns null if valid, or a detailed `MoveError`.
- `errorMessage` — fallback shown when the move returns a bare `INVALID_MOVE`.
- `successLog` — generates a log message for the game log.

### Move Validation Pipeline (`moveWrapper.ts`)

`wrapMove()` is the server-side boundary for every move:

- It runs `validate` once and returns `Invalid(error)` on rejection.
- It converts a bare `INVALID_MOVE` into `Invalid({ message: errorMessage })`.
- boardgame.io rolls back rejected mutations and delivers the payload to the acting client.
- `ActionBoardsAndMap` observes `lastActionError` and displays the message as a toast.

---

## The Resolution Phases

Resolution is not one machine — it is twelve small phases in rulebook order
(see Phase Sequence above). Three patterns make them work:

### Scan-or-skip entry

Each battle-family phase's `onBegin` resets the map cursor and scans for its
kind of work (`helpers/findNext.ts`, left-to-right, top-to-bottom). Work found:
it records the site (`G.mapState.currentBattle`), sets the micro-step
(`G.step`), and `turn.order.first` routes the turn to the acting player.
Nothing found: `events.endPhase()` and the round flows on — an all-peaceful
round cascades through every battle phase in milliseconds.
`__tests__/integration/quietRoundResolution.test.ts` drives exactly that
pacifist round through the real client pipeline as a required-green guard.

### Move-driven continuation

When an interactive step resolves, the move itself advances the phase: the
`nextAfterX` helpers in `helpers/resolutionSequencer.ts` handle same-tile
multi-attacker sequencing, then rescan (`findNextX`) — next site gets
`endTurn({ next })` (legal from a move), an exhausted phase gets `endPhase()`.

### Micro-steps within a phase

`G.step` tracks the sub-state the UI and validators key on — e.g. an aerial
battle walks `aerial_attack_or_pass → aerial_attack_or_evade → aerial_resolve
→ relocate_loser`, with `G.battleState` carrying the combatants.
`getResolutionTarget` (`helpers/resolutionFlow.ts`) and
`checkIfCurrentPlayerIsInCurrentBattle` (`helpers/helpers.ts`) compute the
acting player for step-routing in `turn.onBegin`.

The automatic economy phases (trade → sellGoods → piracy → factoryIncome) and
scoring are exported slice functions in `helpers/resolveRound.ts`, called from
their phases' `onBegin` — pure state transformations, unit-tested with
rule-derived expected values in `roundEffectsPhases.test.ts`.

---

## The Type System (`types.ts`)

### One Clock: `ctx.phase` + `G.step`

There is exactly one phase clock: boardgame.io's `ctx.phase` (18 values, see
Phase Sequence). The engine's own state carries only the micro-step:

```typescript
type GameStep =
  | "default"
  | "kingdom_advantage" | "legacy_card"          // setup
  | "immediate_election"                          // events
  | "confirm_fow_draw" | "discard_fow"            // actions
  | "aerial_attack_or_pass" | "aerial_resolve"    // battle steps…
  | "conquest_garrison" | "election" | "retrieve_fleets" | ...
  | "round_summary";                              // reset

G.step: GameStep
```

For display, `phaseGroup(ctx.phase)` collapses the 18 phases into the 8
rulebook groups (the twelve resolution phases → `"resolution"`). A historical
note for readers of old commits: the engine once kept a second clock,
`G.stage: { phase, sub }`, whose divergence from `ctx.phase` bred a whole
workaround genus (`validStages`, redirect layers, `skipEndTurn`). It was
removed in the July 2026 resolution redesign.

### MyGameState (G)

The full game state. Key fields:

```typescript
{
  playerInfo: Record<string, PlayerInfo>   // per-player state
  mapState: MapState                       // tile grid, buildings, battle map
  boardState: ActionBoardInfo              // counsellor placement slots
  cardDecks: CardDeckInfo                  // all card pools
  step: GameStep                           // micro-step within the current phase
  round: number
  turnOrder: string[]                      // player order this round
  battleState?: BattleState                // active battle info
  eventState: EventState                   // active event resolution
  gameLog: { round: number; message: string }[]
}
```

### FleetInfo

```typescript
{
  fleetId: number
  location: number[]           // [x, y] on the map
  skyships: number
  regiments: number
  levies: number
  eliteRegiments: number
  travelHistory: [number, number][]   // tiles visited, for trade route trails
}
```

### MapState

```typescript
{
  currentTileArray: TileInfoProps[][]    // 8×4 grid of tile data
  discoveredTiles: boolean[][]           // which tiles are face-up
  buildings: MapBuildingInfo[][]         // outpost/colony/fort per tile
  battleMap: string[][][]               // which players have fleets on each tile
  routeSkyships: Record<string, string[]>  // trade route markers per tile
  goodsPriceMarkers: GoodsPriceMarkers  // current market prices
}
```

---

## The AI Bot System (`packages/game/src/ai/`)

### Overview

```
EmpiresBot.chooseMove(G, ctx, playerID)
  │
  ├─ enumerate.ts → generates all legal moves for current state
  │
  ├─ Phase evaluators → score each move:
  │   ├─ ActionsEvaluator    (action phase)
  │   ├─ DiscoveryEvaluator  (tile flips)
  │   ├─ EventsEvaluator     (event card picks)
  │   └─ ResolutionEvaluator (battles, elections, conquests)
  │
  ├─ MCTS (action phase only) → simulate future to pick best move
  │   ├─ MCTSSearch.ts       (tree search loop)
  │   ├─ MCTSNode.ts         (tree nodes with UCB1)
  │   ├─ StateSimulator.ts   (applies moves to cloned state)
  │   └─ StateEvaluator.ts   (scores a position)
  │
  └─ returns { move: "deployFleet", args: [...] }
```

### EmpiresBot.chooseMove() (`EmpiresBot.ts`)

Routes decisions based on the current phase:

- **Setup**: Pick KA card and legacy card using heuristic scoring
- **Events**: Use EventsEvaluator to pick event cards
- **Discovery**: Use DiscoveryEvaluator to pick tiles
- **Actions**: Use ActionsEvaluator to score moves, then MCTS to simulate ahead
- **Resolution**: Use ResolutionEvaluator for battles, elections, conquests

For the action phase specifically:
1. `enumerateLegalMoves()` generates all valid moves
2. `ActionsEvaluator` scores each move with a quality in [0, 1]
3. `mctsSearch()` runs simulations using those scores as priors
4. Best move by visit count is returned

### Move Enumeration (`enumerate.ts`)

Generates every legal move for the current game state. For each phase/sub-phase, it knows which moves exist and what arguments they take. It calls each move's `validate()` function to filter out illegal options.

For the action phase, this generates moves like:
- `deployFleet(fleetIdx, [x,y], skyships, regiments, levies, elites)` for every valid fleet + destination
- `foundBuildings(slotIdx)` for each building type the player can afford
- `recruitCounsellors(count)`, `purchaseSkyships(count)`, etc.

### Action Evaluators (`evaluators/actions/`)

Each move type has its own evaluator file:
- `deployFleet.ts` — scores based on destination value, military strength, connectivity
- `foundBuildings.ts` — scores based on building type, VP value, economy impact
- `recruitCounsellors.ts` — scores based on how many counsellors the player has left
- `misc.ts` — covers the remaining move types (24 KB, most complex evaluator)
- etc.

Each returns a `quality` score between 0 and 1, plus a `reason` string explaining the score.

### Personality System (`evaluators/archetypes.ts`)

Each bot gets a personality derived from its KA + legacy card combination. Different card combos produce different weight adjustments:
- Territory-focused bots value outposts and colonies more
- Military bots value troops and fleet deployment more
- Religious bots value cathedrals and heresy moves more
- Economy bots value trade routes and factories more

This ensures bots with different cards play differently.

### MCTS (`mcts/`)

Monte Carlo Tree Search for the action phase:

1. **Select** — walk the tree using UCB1 (exploitation + exploration)
2. **Expand** — pick an untried child move
3. **Simulate** — `StateSimulator` applies the move to a cloned state, then rolls out
4. **Evaluate** — `StateEvaluator` scores the resulting position
5. **Backpropagate** — update visit counts and rewards up the tree

The evaluator weights were tuned using CMA-ES (`ai/tuner/cma_tuner.py`), a Python optimizer that runs batches of self-play games and adjusts weights to maximize win rate.

---

## Frontend Component Structure

The in-game UI is a **stable frame**: one layout for every phase and both turn
states. Turn/phase changes swap content (prompt text, overlay visibility),
never the frame — the map keeps its size and camera.

```
Client.tsx
  └─ ActionBoardsAndMap (root game component)
       └─ layout/GameLayout — the stable frame
            ├─ layout/TopStrip     — round / phase / turn + mini heresy gauge; panel tab icons
            ├─ layout/OpponentRail — player chips (click → dock swap), round timeline, emblem
            ├─ WorldMap/           — 8×4 tile grid, permanent centre; fit-to-discovered camera,
            │   └─ WorldMapTile      battle auto-pan, fleet icons, buildings, route markers
            │
            ├─ action board overlay — ActionBoard/ as a dismissible right side sheet
            │                         (reserves map width during your actions turn)
            ├─ side panel drawer    — GameLog / Stats / Trade / Chat over the map's right edge
            │
            ├─ layout/PromptBar    — "what is the game waiting for?" + your resource chips
            │                        + Clear / Pass / Confirm; hosts map-selection confirms
            ├─ PlayerBoard/PlayerDock — station cards: Kingdom | Forces & Musters | Fleets |
            │                           Cards | Holdings (self full, opponents public-only)
            │
            ├─ DecisionRouter — NON-MODAL decision panels (atoms/DecisionPanel) floating over
            │                   the map: combat prompts, event card fan, event choices, FoW
            │                   draw/discard, rebellion, invasion, conquest, retrieve fleets
            └─ DialogRouter   — true takeover ceremonies only: setup card picks, battle
                                results, garrison, elections, round summary, game over
```

Components receive `MyGameProps` from boardgame.io — that's `{ G, ctx, moves, playerID, isActive }`. They read `G` to render state and call `moves.*()` to dispatch player actions.

Components check `phaseGroup(ctx.phase)` (the 8-group rulebook view) and `G.step` to decide what to show. For example, the aerial battle prompt only opens when `G.step === "aerial_attack_or_pass"` and it's your turn. Action rows call the same `MOVE_DEFINITIONS.*.validate` functions the server runs (disabled states can't drift) and show live costs from `helpers/actionCosts.ts` — the single source of truth shared by moves and UI.

---

## Helper Modules (`packages/game/src/helpers/`)

These are the utility functions that moves and the resolution flow depend on:

| File | What it does |
|------|-------------|
| `findNext.ts` | Map scanners for the battle phases (aerial/plunder/ground/conquest); exhausted scan = endPhase |
| `resolutionSequencer.ts` | Same-tile multi-attacker sequencing (`nextAfterX` helpers moves call after each resolution) |
| `resolutionFlow.ts` | Interactive-step routing: `getResolutionTarget`, deferred-battle/rebellion/invasion handoffs |
| `resolveBattle.ts` | All combat math — aerial and ground battle resolution (30 KB) |
| `combatMath.ts` | Battle formula utilities shared across resolution |
| `resolveRound.ts` | The economy/scoring slice functions the trade→scoring phases call (rule-derived, unit-tested) |
| `resolveRebellion.ts` | Rebellion event resolution logic |
| `resolveInvasion.ts` | Grand army invasion logic |
| `resolveInfidelFleet.ts` | Infidel fleet attack logic |
| `resolveDeferredBattles.ts` | Event-triggered battle handling |
| `mapUtils.ts` | Pathfinding (BFS), neighbor calculation, passability checks, trade route connectivity |
| `stateUtils.ts` | Utilities: remove gold, remove counsellor, check all passed, etc. |
| `helpers.ts` | Misc helpers: find possible destinations, player order, etc. |
| `moveWrapper.ts` | Move validation pipeline (`wrapMove`); `wrapSet.ts` builds per-phase move maps from `MOVE_DEFINITIONS` |
| `eventCardDefinitions.ts` | All 40+ event cards with resolution logic |
| `kaCardDefinitions.ts` | Kingdom Advantage card definitions |
| `legacyCardDefinitions.ts` | Legacy card definitions |
| `legacyCardRegistry.ts` | Legacy card registry and lookup |
| `manufacturedFunSeed.ts` | Rivalry-aware card seeding for balanced games |
| `tradeRouteResolver.ts` | Computes which buildings are connected to Faithdom via route skyships |
| `piracy.ts` | Piracy mechanics (tax vs cut, corsair raids) |
| `logger.ts` | Structured logging system (`LOG_LEVEL=silent` for stress runs) |

---

## Data Files (`packages/game/src/data/`)

| File | What it contains |
|------|-----------------|
| `gameData.ts` | Numeric constants: costs, caps, VP values, map dimensions, Faithdom coordinates, etc. |
| `tileDefinitions.ts` | All map tile data: type, race, loot tables, blocking directions (17 KB) |

---

## Tests (`packages/game/src/__tests__/`)

```bash
cd packages/game
pnpm test              # run all
pnpm test:watch        # watch mode
pnpm vitest run src/__tests__/integration/battleFlow.test.ts   # single file
```

**Test helpers** (`testHelpers.ts`): Factory functions for building test state:
- `buildPlayer(id, overrides)` — creates a PlayerInfo
- `buildFleet(fleetId, overrides)` — creates a FleetInfo
- `buildInitialG()` — creates a minimal MyGameState
- `buildCtx()` — creates a minimal boardgame.io context

**Integration tests** test multi-move flows:
- `actionPhase.test.ts` — counsellor placements, building, deployment
- `battleFlow.test.ts` — aerial and ground combat sequences
- `electionFlow.test.ts` — archprelate voting
- `rebellionFlow.test.ts` — rebellion event handling
- `invasionFlow.test.ts` — grand army invasion

**Conformance guards** — two required-green tests protect the redesigned engine: `rulebookOrder.test.ts` (the phase chain equals the rulebook's Resolution Sequence) and `quietRoundResolution.test.ts` (a combat-free round completes the full round loop through the real client pipeline — the scenario that once soft-locked production).

**AI smoke test** (`ai/selfPlaySmoke.test.ts`) — runs a headless bot game. Slow — skip during normal development.

**Stress runner** (`scripts/stress.mjs`) — N full bot games against the built engine: `pnpm build && LOG_LEVEL=silent pnpm stress 30`. Used as the gate for every engine change.

---

## Rulebook

The original board game rules are in `rulesets/eots42.md` with amendments in `eots42_amendments.md`. When the game logic seems wrong or unclear, check these first.
