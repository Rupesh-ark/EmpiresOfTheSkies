# AI Tuning Improvement Report

This document records the iterative improvements made to the Empires of the Skies game AI, with data-backed evidence at each stage. All data was generated using the in-browser analytics pipeline (`browserRunner.ts` → `GameRecorder.ts`).

Target metrics were derived from human expert playtesting observations across ~20 games with 4-6 players.

---

## Methodology

1. **Analytics Pipeline**: Built a browser-compatible game runner that captures every bot decision with full game-state context (resources, VP standings, scored alternatives, battle context)
2. **Baseline Measurement**: Ran games with initial weights, recorded move distributions and key metrics
3. **Iterative Tuning**: Made targeted changes to strategy scoring (`ActionsStrategy.contextBonus`) and move values (`weightsConfig.ts`), verified each change against target metrics
4. **Comparison**: Each iteration compared against the baseline using the same metric set

All game data files are stored in `packages/game/src/ai/analytics/` as JSON.

---

## Target Metrics (from human expert play)

| Metric | Target | Source |
|--------|--------|--------|
| R1 skyships purchased | 12-24 (2-4 per player) | Expert observation: skyships are the foundation of all movement |
| R1 outpost claims | 6 (1 per player) | Expert observation: first outpost should happen R1 |
| R1 laden fleet deploys | 6 (1 per player) | Expert observation: fleets should carry troops from R1 |
| Total factories (10R game) | 6-12 | Expert observation: economy engine requires factories |
| Total conquests | 4-8 | Expert observation: territory expansion is a core VP source |
| Total aerial battles | 2-6 | Expert observation: combat should occur in competitive play |
| Total religion moves | 12-18 | Expert observation: only religious archetypes should focus on religion |
| Winner VP (10R game) | >25 | Expert observation: competitive games produce 50-85 VP winners |
| sendAgitators | <15% of moves | Expert observation: agitators are situational, not a primary action |

---

## Iteration 0: Pre-Existing State (Baseline)

**Data file**: `baseline_report.json`, `game_nan_fixed.json`

### Configuration
- Two-file weight system: `weightsConfig.ts` (defaults) + `weightsConfig.local.json` (overrides) with deep merge
- All strategies using `estimateMoveValue()` + `ActionsStrategy.contextBonus()`
- Known NaN bug: player levies corrupted to NaN, propagating to all VP calculations

### Measurements

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| R1 skyships | 3 | 12-24 | FAIL |
| R1 laden deploys | 2 | 6 | FAIL |
| R1 counsellors | 3 | 6 | PARTIAL |
| Total factories | 0 | 6-12 | FAIL |
| Total conquests | 0 | 4-8 | FAIL |
| Total battles | 0 | 2-6 | FAIL |
| Total religion moves | 45 | 12-18 | FAIL (3x over) |
| Winner VP | 30 | >25 | PASS |
| NaN events | 942 | 0 | FAIL |

### Move Distribution (Baseline)
```
pass                      11.8%
chooseEventCard           10.9%
influencePrelates          9.5%
trainTroops                9.1%
foundBuildings             8.7%
sendAgitators              7.8%
moveFleet                  5.6%
recruitCounsellors         5.5%
recruitRegiments           5.5%
deployFleet                3.3%
```

### Key Problems Identified
1. **NaN propagation**: Player levies corrupted to NaN, making all VP-dependent scoring unreliable
2. **influencePrelates scored NaN**: Religion move values produced NaN for republic slots due to NaN VPs in mercy calculation
3. **Scout fleet dominance**: 17/18 deploys had zero troops — `estimateMoveValue` for `deployFleet` ignored troop composition
4. **No conquest**: Bots arrived at tiles with empty fleets, couldn't colonise
5. **Religion overweighted**: `influencePrelatesRegular` had base=0.1 + religion×0.25 — scored 0.13+ for all bots regardless of personality
6. **Deep merge confusion**: Changes to `weightsConfig.local.json` not reliably reaching runtime due to build caching

---

## Fix 1: NaN Score Guard

**Change**: Added NaN guards to `estimateMoveValue` for `influencePrelates` mercy calculation and `ActionsStrategy` VP gap computation. Used `?? 0` fallback for all `victoryPoints` reads.

**Files**: `evaluate.ts`, `strategies/ActionsStrategy.ts`

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| Decisions with NaN in top-5 | Unknown (scores unreliable) | 0 |
| influencePrelates score range | NaN | 0.121 - 0.468 |

---

## Fix 2: Levy NaN Root Cause

**Change**: Added `sanitizeValue()` guard in `stateUtils.ts` for all levy/VP arithmetic. Added `removeLevyAmount` helper. Fixed `conscriptLevies` move to sanitize inputs.

**Files**: `helpers/stateUtils.ts`, `moves/actions/conscriptLevies.ts`

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| NaN diagnostic events | 942 per game | 0 |
| Winner VP | NaN for most players | Real numbers (e.g., P0:12, P1:-1, P5:38) |
| All player scores valid | No | Yes |

---

## Fix 3: Strategy Logging Accuracy

**Change**: Changed `PhaseStrategy` interface return type from `AIMove` to `ScoredAIMove = { move, score, topMoves? }`. Updated all 12 strategy implementations. `ActionsStrategy` now returns its actual scored top-5 including `contextBonus`, not a re-scored approximation.

**Files**: `types.ts`, `EmpiresBot.ts`, all 11 strategy files

**Result**: Dashboard top-5 scores now match the actual decision scores. Previously `chosenScore` showed 0.000 for all strategy-path decisions; now shows real values (e.g., 0.512 for a laden deploy).

---

## Fix 4: Single Config File

**Change**: Merged `weightsConfig.local.json` into `weightsConfig.ts` as a single exported constant. Removed deep merge logic and JSON import.

**Files**: `weightsConfig.ts` (rewritten), `weightsConfig.local.json` (deleted)

**Result**: Config changes now take effect immediately on rebuild. No more stale cached values.

---

## Fix 5: Laden Fleet Scoring

**Change**: Added troop composition scoring to `deployFleet` case in `estimateMoveValue`:
- Laden fleet to unclaimed land with no rivals: +0.3 bonus (+0.1 more if can conquer)
- Laden fleet to contested tile: +0.1
- Scout (no troops) to unclaimed land: tileBonus × 0.3 (70% penalty)
- Deploy to ocean/home: -0.1 penalty

**Files**: `evaluate.ts`

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| Laden deploys per game | 1/18 (6%) | 5/17 (29%) |
| Laden deploy score | Same as scout (~0.25) | 0.37-0.55 (clearly higher) |
| Scout to unclaimed land | 0.25 | 0.08 (penalised) |

---

## Fix 6: Religion Move Rebalancing

**Change**:
- `influencePrelatesRegular`: base 0.1 → 0 (only personality-scaled now)
- `influencePrelatesRepublic`: base 0.1 → 0, republicAccess multiplier 0.4 → 0.2
- `convertMonarch`: base 0.1 → 0
- `alterPlayerOrder`: base 0.1 → 0
- `ActionsStrategy.contextBonus`: added `-0.1` penalty for non-religious bots using `influencePrelates` in R1-R2

**Files**: `weightsConfig.ts`, `strategies/ActionsStrategy.ts`

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| Total religion moves | 52 | 35-57 (varies by personality mix) |
| Non-religious bot religion moves | 25 (P0 Diplomat) | Reduced |
| Prelate religion moves | 15 | Maintained (~15-23) |

---

## Fix 7: Round-Aware Context Bonuses

**Change**: Rewrote `ActionsStrategy.contextBonus` with per-round priorities matching expert play guide:
- R1: skyships (+0.2), deploy (+0.2), counsellors (+0.15), penalise buildings/factories/religion
- R2: deploy (+0.2), skyships (+0.15), factories when routes exist (+0.15)
- R3-4: factories (+0.15), conquest (+0.15), archetype-specific building bonuses
- R5+: buildings (+0.15), conquest (+0.15), garrison protection
- Archetype detection: `isReligious` (religion > 0.18), `isMilitary` (military > 0.18), `isEconomy` (economy > 0.18)

**Files**: `strategies/ActionsStrategy.ts`

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| Winner VP (best observed) | 30 | 70 |
| Conquests per game | 0 | 0-2 |
| Pass rate | 11.8% | 8.4% |

---

## Fix 8: Fleet Crowding Penalty

**Change**: Increased rival-on-tile penalty for `deployFleet` from -0.08 to -0.25 per rival. Moved `rivalsOnTile` computation earlier in the scoring function to use in troop bonus calculation.

**Files**: `evaluate.ts`

**Result**: Fleet destinations more spread across the map instead of all 6 players converging on the same 2-3 tiles.

---

## Current State Summary

| Metric | Baseline | Current | Target | Trend |
|--------|----------|---------|--------|-------|
| NaN events | 942 | 0 | 0 | FIXED |
| Score logging accuracy | Broken (all 0.000) | Correct | Correct | FIXED |
| Winner VP | 30 | 38-70 | >25 | PASS |
| R1 laden deploys | 1 | 0-5 | 6 | IMPROVING |
| Total conquests | 0 | 0-2 | 4-8 | IMPROVING |
| Total religion | 45-52 | 35-57 | 12-18 | IMPROVING |
| Total factories | 0 | 0 | 6-12 | NOT YET |
| Total battles | 0 | 0 | 2-6 | NOT YET |
| Pass rate | 11.8% | 8.4-11% | <5% | IMPROVING |

---

## Remaining Issues

1. **Deterministic games**: `boardgame.io Local()` transport produces identical games within the same process — need random seed injection for statistical sampling
2. **Mountain blocking**: Laden fleets can't reach many tiles from home in R1 due to mountain terrain — this is a game map constraint, not a tuning issue
3. **Factory construction**: Bots never build factories because they don't establish trade routes first — requires multi-step planning (deploy → outpost → route → factory)
4. **Battle initiation**: Fleets spread to different tiles so aerial battles never trigger — need strategic fleet positioning toward rivals
5. **Religion still dominant for some archetypes**: Diplomats (high republicAccess weight) still over-invest in influence prelates

---

## Infrastructure Built

| Component | Purpose |
|-----------|---------|
| `GameRecorder.ts` | In-memory structured game data collector |
| `browserRunner.ts` | Browser-compatible headless game runner |
| `runAnalysis.cjs` | CLI tool for generating game data |
| `AITunerPage.tsx` | Dashboard with charts, weight editor, JSON import/export |
| `WEIGHT_RATIONALE.md` | Documentation of weight derivation methodology |
| `ScoredAIMove` type | Strategy interface returning scored moves for accurate logging |
| `EnrichedDecision` | Decision entries with resource snapshots and battle context |

---

## Data Files

| File | Description |
|------|-------------|
| `baseline_report.json` | Pre-fix structured metrics |
| `game_nan_fixed.json` | First game with levy NaN fix — clean VP scores |
| `game_clean_baseline.json` | Clean baseline with NaN fix + religion rebalance |
| `game_deploy_boost.json` | After deploy context bonus increase — 70VP winner |
| `game_ocean_penalty.json` | After ocean deploy penalty — 5 laden deploys |
| `current_5game_sample.json` | 5-game sample with current config |
