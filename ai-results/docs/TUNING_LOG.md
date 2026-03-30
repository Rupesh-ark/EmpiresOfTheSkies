# AI Tuning Log — Empires of the Skies

## Session: 2026-03-27
### Context
Tuning the AI bot behaviour after fixing critical resolution chain bugs (see `docs/AI_BOT_RESOLUTION_FIXES.md`). Bots now execute the full game loop — discovery, actions, aerial/ground battles, plunder, conquest, election, invasions, rebellions, and fleet retrieval. This session focuses on tuning weights and thresholds to produce realistic, competitive gameplay.

All data collected via `runGameInBrowser()` with unique `matchID` per game to prevent state caching. Each data point is a fresh 6-player game running the full ruleset (v4.2).

---

## Baseline Measurement (n=10 games, pre-tuning)

Collected after all resolution chain fixes were applied but before any weight/threshold changes.

| Metric | Value |
|---|---|
| Games completed | 10/10 |
| Avg rounds/game | 6 |
| Avg moves/game | 424 |
| Pass rate | 9.8% |
| Attacks/game | 1.5 |
| Fight rate (fights / (fights+evades)) | 13% (2 fights, 13 evades) |
| doNotAttack/game | 3.4 |
| Outposts built/game | 10.8 |
| Colonies/game | 6.3 |
| Retrieves/game | 7.3 |
| Max VP observed | 71 |

### Baseline end-game economy (per player, n=60 player-games)

| Resource | Mean | Median |
|---|---|---|
| Gold | -11 | -10 |
| Troops (reg+levy+elite) | 14 | 10 |
| Skyships | 3 | 2 |
| Active fleets | 2 | 2 |
| Factories | 1 | 1 |
| Territory (outpost+colony) | 0.5 | 0 |
| VP | 11 | 6 |

### Baseline observations
- **Combat is rare and one-sided.** 1.5 attacks per game, 87% evade rate. Defenders almost always flee regardless of strength or what they're defending.
- **Territory is transient.** 10.8 outposts built per game but only 0.5 territory per player at end — bots lose settlements to events, battles, or never garrison them.
- **Economy stagnates.** Every player ends with exactly 1 factory. No bot builds a second factory despite having trade routes. Gold goes negative from building spam.
- **Building spam.** Bots build 8-16 religious/civic buildings per game (`foundBuildings`), each costing 3-5 gold, without income to support it.

---

## Tuning Change 1: Lower Attack Threshold

**File:** `ai/strategies/AerialBattleStrategy.ts`
**Parameter:** `baseThreshold` in `decideAttack()`

| | Before | After |
|---|---|---|
| Formula | `1.4 - aggression * 0.4` | `1.2 - aggression * 0.4` |
| Range (aggression 0→1) | 1.4x to 1.0x | 1.2x to 0.8x |
| Balanced bot (aggression ~0.3) | needs 1.28x advantage | needs 1.08x advantage |

**Rationale:** Bots required a significant strength advantage before attacking. A balanced bot (aggression ~0.3, derived from `military * 2.5`) needed 1.28x strength ratio. This meant bots almost never attacked evenly-matched opponents, even when tile gains (territory, loot) justified the risk. The gain-aware threshold modifier (`tileGain * 0.5`) was already in place but couldn't overcome the high base.

**Expected effect:** More attacks initiated, especially on valuable tiles.

---

## Tuning Change 2: Lower Evade Threshold

**File:** `ai/strategies/AerialBattleStrategy.ts`
**Parameter:** `baseFightThreshold` in `decideEvade()`

| | Before | After |
|---|---|---|
| Formula | `0.8 - aggression * 0.2` | `0.7 - aggression * 0.3` |
| Range (aggression 0→1) | 0.8x to 0.6x | 0.7x to 0.4x |
| Balanced bot (aggression ~0.3) | flees below 0.74x ratio | flees below 0.61x ratio |

**Rationale:** Defenders evaded 87% of the time. The threshold was too generous — a balanced bot would flee even when they had 70% of the attacker's strength. With the defense bonus for own territory (0.1 reduction), they'd still flee at 0.64x. This made battles pointless — attackers invested gold deploying fleets only for defenders to always run.

The v4.2 rules include FoW (Fortune of War) cards that add randomness to battle outcomes. A defender at 0.6x strength with a good card can still win. The old threshold didn't account for this — it treated battles as purely deterministic.

**Expected effect:** More defenders stand and fight, especially when protecting their own territory.

---

## Tuning Change 3: Rebalance Move Base Values

**File:** `ai/weightsConfig.ts`
**Parameters:** `moveValues.attack`, `moveValues.passive`, `moveValues.evade`

| Move value | Before | After | Rationale |
|---|---|---|---|
| `attack.base` | 0.10 | 0.15 | Attacking should be attractive when opportunity exists |
| `passive.base` | 0.05 | 0.01 | "Do nothing" was getting a free 0.05 score, competitive with real actions |
| `evade.base` | 0.10 | 0.05 | Evading was scored equal to attacking — should be last resort |
| `evade.threats` | 0.20 | 0.15 | Threat-focused bots still prefer evading, but less dramatically |

**Rationale:** The `estimateMoveValue` function scores each move as `base + Σ(weight × multiplier)`. With `passive.base = 0.05`, doing nothing scored positive even with zero weight alignment. Meanwhile `attack` scored `0.10 + military*0.35 + territory*0.15` ≈ 0.163 for a balanced bot. The gap (0.163 vs 0.05) sounds large but context bonuses, gold pressure penalties (-0.15 when broke), and the aerial threshold filtering meant many situations had attack removed as an option, leaving passive as the default winner.

By lowering passive to 0.01 and raising attack to 0.15, the gap widens from 0.113 to 0.203 — making "do something" consistently outperform "do nothing."

---

## Post-Tuning Measurement (n=10 games)

| Metric | Baseline | After tuning | Delta |
|---|---|---|---|
| Attacks/game | 1.5 | 2.3 | +53% |
| Fight rate | 13% | 43% | +230% |
| doNotAttack/game | 3.4 | 1.5 | -56% |
| Pass rate | 9.8% | 9.6% | -2% |
| Retrieves/game | 7.3 | 7.1 | -3% |

### Post-tuning game quality (n=10 games)

| Metric | Value |
|---|---|
| Winner VP (avg / median) | 39 / 29 |
| VP spread (max-min per game, avg) | 46 |
| VP per player (avg / median) | 11 / 6 |
| End-game gold (avg / median) | -11 / -10 |
| End-game troops (avg / median) | 14 / 10 |
| End-game skyships (avg / median) | 3 / 2 |
| Factories (avg / median) | 1 / 1 |
| Territory per player (avg) | 0.5 |

### Post-tuning per-player sample (Game 1 of 3 detailed games)

| Player | Personality | VP | Gold | Territory | Factories | Deploys | Buildings | Attacks | Skyships | Troops |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | Empire Builder | 11 | -53 | 1 | 1 | 5 | 9 | 1 | 1 | 6 |
| P1 | Merchant | **57** | +10 | 0 | 1 | 5 | 3 | 0 | 6 | 9 |
| P2 | Conqueror | 2 | -9 | 0 | 1 | 3 | 8 | 1 | 2 | 30 |
| P3 | Prelate | 18 | -40 | 0 | 1 | 3 | 13 | 0 | 2 | 6 |
| P4 | Conqueror | 6 | **-168** | 0 | 1 | 3 | **16** | 0 | 4 | 23 |
| P5 | Merchant | 51 | -85 | 0 | 1 | 4 | 16 | 0 | 2 | 1 |

**Notable:** P4 spent 168 gold on 16 buildings with 0 territory and only 6VP — worst ROI in the sample. P1 won with 57VP, +10 gold, and only 3 buildings — most efficient player. This indicates `foundBuildings` is overvalued relative to economic infrastructure.

---

## Stability

Stress test after all changes: **100/100 games completed** (unique matchIDs, avg 1592ms/game, p95=2581ms, max=3060ms).

---

## Identified Issues for Next Tuning Pass

### 1. Building spam without economic foundation
Bots prioritise `foundBuildings` (cathedrals, palaces, shipyards, forts) over `foundFactory`. Each building costs 3-5 gold but factories generate ongoing income. Result: bots go bankrupt funding construction. Every player ends with exactly 1 factory.

**Potential fix:** Increase `foundFactoryEngaged` base value, add context bonus for factory when `player.factories < activeRoutes`, reduce building bonuses in early rounds.

### 2. Territory retention
10.8 outposts built per game but only 0.5 territory per player at end. Bots conquer land but lose it to:
- Lack of garrison (no troops left after conquest)
- Rival attacks (no deterrent)
- Events (rebellions, invasions)

**Potential fix:** Increase garrison scoring, add territory-defense context bonuses.

### 3. Fleet retrieval still high
7-8 retrieves per game. The fleet position scoring (threshold 0.01) may be too sensitive. Bots retrieve fleets that are generating modest value.

**Potential fix:** Lower retrieve threshold further, or add re-deploy cost consideration (retrieving costs movement gold next round).

### 4. Single factory economy
Zero bots build a second factory. The `foundFactoryEngaged` move value (base 0.12 + economy*0.4) is high but loses to building bonuses + context modifiers. May need round-gated boost: "if factories < routes AND round >= 2, boost factory."

### 5. Negative gold doesn't correlate with VP
Observed gold ranges from -168 to +10. The -168 bot (16 buildings, 6VP) performed terribly. The +10 bot (3 buildings, 57VP) won. Gold management needs to be part of the evaluation — spending gold wisely should be rewarded, not just spending.

**Developer note:** Negative gold is acceptable when it represents strategic investment (conquest, decisive battle). It's bad when it represents building spam with no territorial or VP payoff.

---

### Change 4: Weight-scaled personality context bonuses
**File:** `ai/strategies/ActionsStrategy.ts`
**What:** Replaced all flat context bonuses with weight-scaled versions. Instead of boolean checks (`isReligious`, `isMilitary`, `isEconomy`), introduced continuous archetype strength variables (`relStr = w.religion * 5`, `milStr = w.military * 5`, `ecoStr = w.economy * 5`). Every round-gated bonus now multiplies by the relevant archetype strength.

**Key changes:**
- `foundBuildings` bonus: was flat `+0.15` for religious bots, now `+0.2 * relStr - 0.05 * (1-relStr)`. Non-religious bots get penalised for building.
- `foundFactory` bonus: was flat `+0.15`, now `+0.1 + 0.2 * ecoStr`. Economy bots get up to +0.3 total.
- `trainTroops` bonus: was 0 outside round-gated blocks, now `+0.05 * milStr` always + round bonuses.
- `influencePrelates`: was binary (religious=+0.05, else=-0.1), now continuous scale.
- Gold pressure: was flat -0.15 when gold<3, now scales with debt depth and economy bots tolerate more debt (investment spending).

**Rationale:** From strategy guide analysis: a Prelate (religion=0.25) and a Conqueror (religion=0.11) were getting the same building bonuses. The strategy guide defines 6 distinct archetypes with fundamentally different priorities. Flat bonuses washed out the weight differences. Now a Prelate gets +0.20 * 1.0 = +0.20 for buildings while a Conqueror gets +0.20 * 0.55 - 0.05 * 0.45 = +0.09. That 0.11 gap changes which move the bot picks.

### Post-Change-4 Measurement (n=10 games)

| Metric | Pre-personality | Post-personality |
|---|---|---|
| Fight rate | 43% | 56% |
| Retrieves/game | 7.1 | 4.7 |
| TrainTroops/game | ~20 | 29.9 |
| Buildings/game | 58 | 51.8 |

**Observed differentiation (sample game):**
- Prelates: 13-21 buildings, 4-16 prelate actions. Clear religious engine.
- Conquerors: 5-7 recruit actions, 5-6 trainTroops. Military investment.
- Merchants: 2-5 deploy actions. Trade infrastructure focus.

**Remaining issue:** Factories still at 1.0/player. Investigation revealed factory slots are VALID (open) but factory score (0.214 for engaged Merchant) loses to deployFleet (0.755) and purchaseSkyships (0.449). The root cause: bots have 0 active trade routes (0 territory), so factory scores as "unengaged" (0.02 base). This is correct — you shouldn't build factories without routes. The economy stagnation is a symptom of low territory, not a factory scoring problem.

### Change 6: Colonise sense system
**Files:** `helpers/fleetUtils.ts`, `ai/strategies/ConquestStrategy.ts`
**What:** Added reusable utility functions (`calculateFleetSwords`, `playerSwordsAtTile`, `hasTroopsAtTile`, `bestHandSwords`, `coloniseConfidence`) to `fleetUtils.ts`. ConquestStrategy now uses `coloniseConfidence()` to compare the bot's expected attack power (fleet swords + garrison + best FoW card) against the tile's defence (tile swords + expected FoW draw of ~2.5).

**Decision logic:**
- confidence >= 1.5: colonise confidently (comfortable win)
- confidence 1.0-1.5: only aggressive bots attempt (risky)
- confidence < 1.0: build outpost instead (safe)

**Rationale:** Bots were attempting `coloniseLand` (FoW battle required) 5.2 times per game without assessing whether they could win. Failed conquests destroy the outpost. The colonise sense system checks army strength vs tile swords before committing. Bots now prefer the safe `constructOutpost` when the tile is too strong, and only colonise when they have a clear advantage.

### Post-Change-6 Measurement (n=10 games)

| Metric | Before | After |
|---|---|---|
| Outposts built/game | 10.8 | 13.4 (+24%) |
| Colony attempts/game | 5.2 | 1.9 (-63%) |
| Territory/player (end) | 0.5 | 0.5 (unchanged) |

Colony attempts dropped 63% — bots are being much more selective. Outposts increased as bots prefer the safe path. Territory retention still at 0.5 — investigation needed into WHERE territory is lost (battles, events, or lack of garrison).

### Change 5: Remove gold check from sendAgitators
**File:** `moves/actions/sendAgitators.ts`
**What:** Removed `if (gold < AGITATOR_COST) return INVALID_MOVE` check.
**Rationale:** The game has explicit debt mechanics — players can go into negative gold. The only rule that blocks spending during debt is the "Lenders Refuse Credit" event (already handled by `validateMove`). Agitators costing 2 gold should be payable even when in debt, same as all other gold-costing actions. This was inconsistent with how foundBuildings, deployFleet, etc. handle gold (they just subtract, no minimum check).
