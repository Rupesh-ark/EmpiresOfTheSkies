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

`@eots/game` is the shared library. It compiles to three outputs (ESM, CJS, types) so both the frontend and server can import it. The frontend uses ESM, the server uses CJS.

**Build order matters**: game engine first, then server and frontend.

```bash
pnpm build:all    # runs: @eots/game build → server build → frontend build
```

The game engine build is defined in `packages/game/package.json`:
```
build:types  →  tsc -p tsconfig.types.json   →  dist/types/
build:esm    →  tsc -p tsconfig.esm.json     →  dist/esm/
build:cjs    →  tsc -p tsconfig.cjs.json      →  dist/cjs/
```

A small `write-cjs-package.cjs` script writes `{ "type": "commonjs" }` into `dist/cjs/` so Node treats those files as CJS.

---

## How a Game Starts

### 1. Server boots (`server/src/server.ts`)

```typescript
const db = new PostgresStore(process.env.DATABASE_URL || "postgresql://eots:eots@localhost:5432/eots");

const server = Server({
  games: [MyGame],
  origins: allowOrigin,
  db,
});
server.run(PORT, () => log.info(`Server running on port ${PORT}`));
```

That's it. boardgame.io handles match creation, player joining, move validation, and state sync over SocketIO.

There's also a `POST /api/bot-log` endpoint that bot clients send decision logs to. These get written to `bot-logs/game-{matchID}.txt`.

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

boardgame.io's `Client()` wires everything: it connects to the server via SocketIO, subscribes to state changes, and passes `{ G, ctx, moves, playerID, isActive }` as props to the `board` component.

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

Each round cycles through these phases in order:

```
setup → events → discovery → taxes → actions → resolution → reset → events → ...
```

(Setup only runs once. After that it loops events → ... → reset → events.)

Each phase is defined with:
- `onBegin` — initialization logic when entering the phase
- `moves` — which moves are legal during this phase
- `turn` — turn order, auto-pass logic, move limits
- `next` — which phase comes after
- `onEnd` — cleanup when leaving

**Key phases:**

**events** — Each player picks an event card. Some events need interactive resolution (elections, rebellions). Turn order follows `G.turnOrder`.

**discovery** — Players flip undiscovered tiles on the map or pass. Once everyone passes, the phase ends.

**taxes** — Automatic. Calculates gold income from colonies, trade, buildings, and applies modifiers. No player interaction.

**actions** — The main phase. Players take turns placing counsellors on the shared action board to do things: deploy fleets, found buildings, recruit troops, buy skyships, influence prelates, propose deals, etc. ~60 moves are available. Ends when everyone passes (no counsellors left).

**resolution** — A complex multi-step sequence. Aerial battles → plunder legends → ground battles → conquests → election → deferred events → rebellions → invasions → fleet retrieval. The resolution sequencer walks through all of these.

**reset** — Recomputes turn order, checks if the game should end.

### Move Registration 

Every move is wrapped before being handed to boardgame.io:

```typescript
moves: {
  discoverTile: wrapMove("discoverTile", discoverTile),
  deployFleet: wrapMove("deployFleet", deployFleet),
  // ... ~60 more
}
```

`wrapMove()` (from `helpers/moveWrapper.ts`) adds:
- Logging (move name, player, phase, args)
- Phase/stage guards
- Loop guard checks (prevents infinite transitions)

### Turn Budget Plugin 

A custom boardgame.io plugin that counts `endTurn()` and `endPhase()` calls per round. If it exceeds 550, it force-ends the game. This is a safety net against infinite loops in the resolution phase.

---

## How Moves Flow

### From UI to State

1. Player clicks a button in the UI (e.g. "Deploy Fleet")
2. Component calls `props.moves.deployFleet(fleetIdx, destination, skyships, regiments, levies, elites)`
3. boardgame.io client sends this to the server over SocketIO
4. Server runs the move function, which mutates `G`
5. Server broadcasts the new `G` to all connected clients
6. All clients re-render with the updated state

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
- `validate` — optional pre-check. Returns null if valid, or a `MoveError`.
- `errorMessage` — shown to player if the move is rejected.
- `successLog` — generates a log message for the game log.

### Move Validation Pipeline (`moveWrapper.ts`)

`wrapMove()` wraps every move with:
- `withPhaseGuard()` — rejects moves if the game is in the wrong phase
- `checkLoopGuard()` — rejects if the turn budget is exhausted
- Logging — timestamps, player, phase, args

---

## The Resolution Sequencer

The resolution phase is the most complex part. It walks through a fixed sequence of sub-phases, each of which may or may not have anything to resolve.

### Entry Point

When the resolution phase begins, `Game.ts` calls `beginResolution(G, events)` in the phase's `onBegin`. This kicks off the sequencer.

### The Chain (`resolutionSequencer.ts`)

```
beginResolution()
  → findNextBattle()      scan map for aerial battles
  → toPlunder()           
  → findNextPlunder()     scan for plunder opportunities
  → toGround()
  → findNextGroundBattle() scan for ground sieges
  → toConquest()
  → findNextConquest()    scan for unoccupied tiles to claim
  → toElection()
  → enterElection()       archprelate voting
```

Each `findNext*()` function scans the map left-to-right, top-to-bottom. If it finds something to resolve, it sets `G.stage` to the appropriate sub-phase and `events.endTurn({ next: relevantPlayer })` to hand control to the right player. If nothing found, it calls the next function in the chain.

### After the Sequencer (`resolutionFlow.ts`)

After the sequencer finishes (election done), `resolutionFlow.ts` takes over:

```
continueResolution()
  → setupNextDeferredBattle()    (event-triggered battles)
  → continueAfterDeferredBattles()
    → setupNextRebellion()       (interactive rebellion resolution)
    → checkForInvasion()         (grand army invasion)
    → stage: "retrieve_fleets"   (final step — players retrieve fleets)
```

### Sub-Phases During Resolution

`G.stage.sub` changes as the sequencer advances:

```
aerial_attack_or_pass → aerial_battle_cards → aerial_battle_result
→ plunder_or_pass → ground_attack_or_pass → ground_defence
→ conquest → conquest_garrison → conquest_draw_or_pick
→ election → post_election_heresy
→ deferred_aerial_battle → rebellion → rebellion_contribution
→ invasion → retrieve_fleets
```

Each sub-phase has specific moves available (attack/evade/defend/vote/garrison/etc).

---

## The Type System (`types.ts`)

### GameStage — Discriminated Union

```typescript
type GameStage =
  | { phase: "setup"; sub: "kingdom_advantage" | "legacy_card" }
  | { phase: "events"; sub: "default" | "immediate_election" | ... }
  | { phase: "discovery"; sub: "default" }
  | { phase: "actions"; sub: "default" | "confirm_fow_draw" | "discard_fow" }
  | { phase: "resolution"; sub: "aerial_attack_or_pass" | "conquest" | ... }
  | { phase: "scoring"; sub: "default" }
  | { phase: "reset"; sub: "default" }
```

This is type-safe — if you check `G.stage.phase === "actions"`, TypeScript knows that `G.stage.sub` can only be `"default" | "confirm_fow_draw" | "discard_fow"`. Illegal combinations are a compile error.

### MyGameState (G)

The full game state. Key fields:

```typescript
{
  playerInfo: Record<string, PlayerInfo>   // per-player state
  mapState: MapState                       // tile grid, buildings, battle map
  boardState: ActionBoardInfo              // counsellor placement slots
  cardDecks: CardDeckInfo                  // all card pools
  stage: GameStage                         // current phase/sub
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

```
Client.tsx
  └─ ActionBoardsAndMap (root game component)
       ├─ StatusBar/         — round, phase, current player display
       ├─ WorldMap/          — 8×4 tile grid, fleet icons, buildings, route markers
       │   └─ WorldMapTile   — individual tile with overlays
       ├─ ActionBoard/       — counsellor placement board
       ├─ PlayerBoard/       — your kingdom's resources, fleets, buildings
       ├─ PlayerTable/       — summary of all players
       ├─ Cards/             — FoW, KA, Legacy card displays
       ├─ Chat/              — in-game chat
       ├─ Trade/             — deal proposal interface
       │
       └─ Phase-specific dialogs:
           ├─ AerialBattle/   — fleet combat UI
           ├─ GroundBattle/   — siege resolution
           ├─ Election/       — archprelate voting
           ├─ Events/         — event card selection
           ├─ PlunderLegends/ — plunder legends UI
           └─ Resolution/     — end-of-round dialogs (retrieve fleets, etc.)
```

Components receive `MyGameProps` from boardgame.io — that's `{ G, ctx, moves, playerID, isActive }`. They read `G` to render state and call `moves.*()` to dispatch player actions.

Components check `G.stage.phase` and `G.stage.sub` to decide what to show. For example, the aerial battle dialog only opens when `G.stage.sub === "aerial_attack_or_pass"` and it's your turn.

---

## Helper Modules (`packages/game/src/helpers/`)

These are the utility functions that moves and the resolution flow depend on:

| File | What it does |
|------|-------------|
| `resolutionSequencer.ts` | Walks the resolution chain (aerial → plunder → ground → conquest → election) |
| `resolutionFlow.ts` | Continues after sequencer (deferred battles → rebellions → invasion → retrieve) |
| `resolveBattle.ts` | All combat math — aerial and ground battle resolution (30 KB) |
| `combatMath.ts` | Battle formula utilities shared across resolution |
| `resolveRound.ts` | End-of-round scoring: trade routes, piracy, factory income |
| `resolveRebellion.ts` | Rebellion event resolution logic |
| `resolveInvasion.ts` | Grand army invasion logic |
| `resolveInfidelFleet.ts` | Infidel fleet attack logic |
| `resolveDeferredBattles.ts` | Event-triggered battle handling |
| `mapUtils.ts` | Pathfinding (BFS), neighbor calculation, passability checks, trade route connectivity |
| `stateUtils.ts` | Utilities: remove gold, remove counsellor, check all passed, etc. |
| `helpers.ts` | Misc helpers: find possible destinations, player order, etc. |
| `moveWrapper.ts` | Move validation pipeline (wrapMove, withPhaseGuard, checkLoopGuard) |
| `eventCardDefinitions.ts` | All 40+ event cards with resolution logic |
| `kaCardDefinitions.ts` | Kingdom Advantage card definitions |
| `legacyCardDefinitions.ts` | Legacy card definitions |
| `legacyCardRegistry.ts` | Legacy card registry and lookup |
| `manufacturedFunSeed.ts` | Rivalry-aware card seeding for balanced games |
| `tradeRouteResolver.ts` | Computes which buildings are connected to Faithdom via route skyships |
| `piracy.ts` | Piracy mechanics (tax vs cut, corsair raids) |
| `logger.ts` | Structured logging system |
| `stageUtils.ts` | `setStage()` helper for type-safe stage transitions |

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

**AI smoke test** (`ai/selfPlaySmoke.test.ts`) — runs a headless bot game. Slow — skip during normal development.

---

## Rulebook

The original board game rules are in `rulesets/eots42.md` with amendments in `eots42_amendments.md`. When the game logic seems wrong or unclear, check these first.
