# Bugs Discovered by Bot Testing

Bot self-play exposed game logic bugs that were never triggered by human playtesting. These are real game bugs, not bot-specific issues — they would affect human players too under the right conditions.

---

## Bug 1: Aerial Battle Turn Transition 

**Discovered:** During first successful fleet deployment after weight tuning
**Severity:** Game-breaking (infinite stall)

**Symptom:** Game stalls in `aerial_battle` phase. The attacker calls `attackOtherPlayersFleet` which internally calls `endTurn({ next: defenderID })`, but the turn never advances to the defender.

**Root cause:** `endTurn()` is silently discarded when called inside `phase.onBegin` in boardgame.io. The battle setup code was running in the wrong lifecycle hook.

**Why bots found it:** Human players never deployed fleets in testing (the game was too short at 4 rounds, and fleet deployment wasn't obvious in the UI). Bots with tuned weights deployed fleets for the first time, triggering aerial battles that had never been tested player-vs-player.

**Fix:** Moved battle setup logic from `phase.onBegin` to `turn.onBegin` where `endTurn()` works correctly.

---

## Bug 2: Faerie Plague NaN Cascade

**Discovered:** After actions strategy fix caused bots to reach late-game events
**Severity:** Game-breaking (crash in invasion resolution)

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'playerID')` in `resolveInvasion.ts:applyDefeatVPPenalties`. The `smallestGroup` array is empty because `totalSwords` is `NaN`, and `NaN === NaN` is `false` in JavaScript.

**Root cause chain:**
1. The **Faerie Plague** event (`eventCardDefinitions.ts:608-615`) iterates ALL map tiles and halves garrison troops:
   ```ts
   tile.garrisonedRegiments -= Math.floor(tile.garrisonedRegiments / 2);
   ```
2. Ocean, Legend, and unoccupied tiles have `garrisonedRegiments` as `undefined` (not `0`)
3. `undefined - Math.floor(undefined / 2)` = `undefined - NaN` = `NaN`
4. NaN propagates: garrison → fleet troops (via `garrisonTroops` transfer) → player resources (via `retrieveFleets`)
5. Bot sends NaN resources as args to `contributeToGrandArmy` → stored as `{ regiments: NaN, levies: NaN }`
6. `totalSwords = NaN * 2 + NaN + skyships = NaN`
7. `ascending.filter(c => c.totalSwords === NaN)` → empty (NaN !== NaN) → crash

**Why bots found it:** The Faerie Plague event requires discovered land tiles to fire (void condition). Previous bot runs never discovered enough tiles because discovery was broken (85% pass rate). After fixing discovery + actions, bots played full 10-round games with active exploration, triggering late-deck events for the first time.

**Fix:** Added `?? 0` fallback in Faerie Plague handler:
```ts
const gr = tile.garrisonedRegiments ?? 0;
tile.garrisonedRegiments = gr - Math.floor(gr / 2);
```
Also added defensive `Number() || 0` coercion in `contributeToGrandArmy.ts` as defense-in-depth.

---

## Bug 3: sendAgitators Infinite Spam 

**Discovered:** 2026-03-25, during baseline diagnostic
**Severity:** Gameplay-breaking (bot gold drain, not a crash)

**Symptom:** Bots send agitators to ALL 5 rivals every round, draining 10 gold on a low-value action.

**Root cause:** No per-rival-per-round limit on sendAgitators. The move cost no counsellor, just 2 gold, and was always available. Combined with the agitator scoring being higher than pass (0.087 vs 0.0), bots chose it repeatedly.

**Rule reference:** Amendment rules state "A player may send at most one Agitator per rival per Round."

**Fix:** Added `agitatorsSentThisRound: string[]` tracking to PlayerInfo. Validate rejects duplicate targets. Reset in the reset phase.

---

## Bug 4: declareSmugglerGood Infinite Loop

**Discovered:** 2026-03-25, during enumerate gap audit
**Severity:** Game-breaking (infinite loop)

**Symptom:** Bot with `licenced_smugglers` KA card spams `declareSmugglerGood` every iteration because the move has no counsellor cost, no gold cost, and no guard against re-declaration.

**Root cause:** The enumerate function always listed `declareSmugglerGood` for smuggler players without checking if they'd already declared this round.

**Fix:** Added guard in enumerate: `!player.resources.smugglerGoodChoice` — only enumerate if not already declared.

---

## Bug 5: confirmAction in confirm_fow_draw Stage (FIXED)

**Discovered:** 2026-03-26, during actions strategy refactor
**Severity:** Game stall (50+ iterations stuck)

**Symptom:** Bot gets stuck in `confirm_fow_draw` stage. The ActionsStrategy returned `confirmAction` for this sub-stage, but `confirmAction.validate` checks `turnComplete` — which may be false when entering this stage from a `drawFoWCards` action.

**Root cause:** The `confirm_fow_draw` stage requires calling the `drawFoWCards` move (not `confirmAction`). The bot's sub-stage handler incorrectly returned `confirmAction`.

**Fix:** Changed sub-stage handler to return `{ move: "drawFoWCards", args: [] }` for `confirm_fow_draw` stage.

---

## Bug 6: Conquest Garrison Transfers Levies to Regiments (NOTED — not yet fixed)

**Discovered:** During code review of resolveBattle.ts
**Severity:** Minor gameplay bug

**Symptom:** In `resolveBattle.ts:632`, when a conquest fails and garrison levies are transferred back to fleets, the code adds them to `fleet.regiments` instead of `fleet.levies`:
```ts
// Line 624-635: garrisonedLevies block
fleet.regiments += lowerAmount;  // BUG: should be fleet.levies
```

**Root cause:** Copy-paste error from the garrisonedRegiments block above it.

**Status:** Noted during investigation, not yet fixed. Low priority — only affects the specific case of failed conquest with garrisoned levies.

---

## Bug 7: Empty Relocation Tiles Stalls Aerial Battle (FIXED)

**Discovered:** After deploy destination scoring enabled fleet combat
**Severity:** Game-breaking (infinite stall)

**Symptom:** Game stalls at `aerial_battle/relocate loser` stage. The winner needs to relocate the defeated fleet, but `G.validRelocationTiles` is empty — no adjacent tiles are available (all occupied by other fleets). The enumerate generates 0 moves, the bot returns null, game loop iterates forever.

**Root cause:** `resolveBattle.ts` always sets `G.stage = "relocate loser"` after a battle, even when there are no valid relocation destinations. The game should skip the relocate stage when no tiles are available.

**Why bots found it:** With destination-aware deploy scoring and crowding penalties, bots spread fleets across different tiles, creating actual aerial battles. The battles produced losers who needed relocation, but in a dense map where most adjacent tiles already had fleets, no empty tiles existed.

**Fix:** Added guard in `resolveBattle.ts`: when `validRelocationTiles.length === 0`, skip the relocate stage and call `findNextPlayerInBattleSequence()` directly instead of entering the unresolvable stage.

---

## Bug 9: Infinite Turn Redirect Loop in Battle Phases (FIXED)

**Discovered:** `ground_battle/attack or pass` stalls consistently in 5/5 runs
**Severity:** Game-breaking (blocks all moves, infinite loop)

**Symptom:** boardgame.io error: `"Maximum number of turn endings exceeded for this update. This likely means game code is triggering an infinite loop."` All moves rejected with `"events plugin declared action invalid"`. Game stuck permanently.

**Root cause chain:**
1. `ground_battle.onBegin` calls `findNextGroundBattle(G, events)`
2. If no ground battles exist, `findNextGroundBattle` calls `events.endPhase()` — but this runs inside `phase.onBegin`, so boardgame.io **silently discards** it (documented boardgame.io bug)
3. `G.stage` is set to `"conquest"` (the next phase's stage) — this mutation works since it's direct G assignment
4. boardgame.io starts the first turn with the default player
5. `turn.onBegin` fires → `checkIfCurrentPlayerIsInCurrentBattle` → battleMap is empty → calls `findNextGroundBattle` again → which calls `endPhase()` again → triggers another `turn.onBegin` → **infinite loop**
6. boardgame.io hits its max turn endings limit and blocks ALL further moves for this update

**Why bots found it:** The ground_battle phase runs every round. With no fleets on rival buildings (rare in early bot games), `findNextGroundBattle` finds nothing and tries to skip. The `endPhase` discard creates the loop. Human games rarely had fleets deployed, so the phase always skipped cleanly (fewer turn transitions).

**Fix:** In `checkIfCurrentPlayerIsInCurrentBattle`, detect when `G.stage` has already been advanced past the current phase (proof that `phase.onBegin` processed and tried to `endPhase`). In that case, call `endPhase()` once from `turn.onBegin` (where it works) instead of re-entering the `findNext` loop. This applies to aerial_battle, ground_battle, plunder_legends, and conquest phases.

**Impact:** This single fix resolved ALL remaining intermittent stalls. After the fix, 5/5 games complete to gameover with zero null moves.

---

## Bug 10: Ground Battle Enumerate Targets All Players (FIXED)

**Discovered:** STUCK dump showed `attackPlayersBuilding` targeting players with no building on the tile
**Severity:** Game stall (move rejected, turn stuck)

**Symptom:** In `ground_battle/attack or pass`, the enumerate lists `attackPlayersBuilding` for every rival, not just the one who owns the building on the current tile. Bot picks a rival with no building → move silently fails → stall.

**Root cause:** `enumerate.ts` ground_battle case iterated `ctx.playOrder` and listed all rivals as targets, without checking if they have a building at `G.mapState.currentBattle`.

**Fix:** Changed enumerate to check `G.mapState.buildings[y][x]` and only list the building owner as a valid target.

---

## Pattern: Why Bots Find More Bugs Than Humans

1. **Volume:** 5-game bot run = 50+ rounds of play in 2 seconds. Human playtest session = 1 partial game in 2 hours.
2. **Coverage:** Bots exercise ALL move combinations including rare ones (garrison transfers, fleet deployments to remote tiles, late-game events). Humans stick to familiar patterns.
3. **Edge conditions:** Bots discover tiles that trigger chain flips through Ocean/Legend tiles, then hit Faerie Plague in round 7 — a sequence that requires specific discovery patterns most human players never produce.
4. **No UI guardrails:** Human players can't click buttons that don't exist in the UI. Bots enumerate all legal moves including ones the UI might hide or discourage.
5. **Speed amplifies rarity:** A 1-in-50 bug takes minutes to find with bots, weeks with human testing.
