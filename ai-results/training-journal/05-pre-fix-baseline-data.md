# Pre-Fix Baseline Data (2026-03-26)

## Context

Data collected AFTER conservative weight tuning (round 1) and aerial battle bug fix,
but BEFORE discovery/actions strategy fixes. This captures the state of the bot with
tuned weights but broken decision-making flow.

Raw data files in `bot-training/data/`:
- `01-baseline-single-game-diag.log` — full diagnostic output from 1 game (DISC + ENUM + ACT logs)
- `02-baseline-move-distribution.log` — move distribution across 5 games

---

## Move Distribution (5 games, avg per game)

| Move | Total | Avg/game | Phase | Assessment |
|------|-------|----------|-------|------------|
| sendAgitators | 232 | 46.4 | actions | DOMINANT — should be <15% |
| pass | 108 | 21.6 | actions(60)+discovery(48) | HIGH — bots give up too early |
| chooseEventCard | 60 | 12.0 | events | Expected (6 players x 10 rounds) |
| vote | 60 | 12.0 | election | Expected |
| punishDissenters | 42 | 8.4 | actions | OK — new move working |
| influencePrelates | 18 | 3.6 | actions | Low |
| contributeToGrandArmy | 18 | 3.6 | resolution | Expected |
| discoverTile | 14 | 2.8 | discovery | VERY LOW — should be ~30+ |
| convertMonarch | 12 | 2.4 | actions | OK |
| declareSmugglerGood | 9 | 1.8 | actions | OK (only for smuggler KA) |
| issueHolyDecree | 9 | 1.8 | actions | Low |
| deployFleet | 1 | 0.2 | actions | CRITICAL FAILURE — should be ~10+ |
| recruitCounsellors | 0 | 0 | actions | CRITICAL FAILURE — should be ~5+ |
| purchaseSkyships | 0 | 0 | actions | CRITICAL FAILURE — should be common |
| buildSkyships | 0 | 0 | actions | CRITICAL FAILURE |
| trainTroops | 0 | 0 | actions | CRITICAL FAILURE |
| recruitRegiments | 0 | 0 | actions | CRITICAL FAILURE |
| foundBuildings | 0 | 0 | actions | CRITICAL FAILURE |
| foundFactory | 0 | 0 | actions | CRITICAL FAILURE |

### Missing Moves (zero occurrences across 5 games)
- purchaseSkyships, buildSkyships, trainTroops, recruitRegiments
- foundBuildings (cathedral, palace, shipyard, fort)
- foundFactory
- moveFleet, garrisonTransfer
- coloniseLand, constructOutpost

---

## Discovery Phase Analysis

### Pass Rate: 48 passes / 62 discovery turns = 77% pass rate

Round-by-round pattern (from single game diagnostic):
- R1: 3 discover, 3 pass (cascade after 50% passed)
- R2: 4 discover (inc. chain flips), 3 cascade pass
- R3: 4 discover, 3 cascade pass
- R4: 5 discover (VP leader chain-flipping), 4 pass
- R5+: almost all pass, 11 tiles still undiscovered

### Root Cause: Threshold Too High
- Best tile scores range: 0.011 - 0.042
- Instant-pass threshold: 0.01 (rarely triggers)
- Cascade threshold: 0.05 when 50%+ passed (triggers constantly)
- P3 passed in R1 with best=0.042 because passedOthers=3/5=60%

### Tile Score Breakdown (early game, no buildings)
```
proximityToHome = (1/(1+dist)) x w.economy x 0.5  ≈ 0.033 max
frontierBonus   = neighbors x 0.02 x w.positioning ≈ 0.009
edgePenalty     = -0.02 (if edge tile)
TOTAL          ≈ 0.020 - 0.042
```

### Missing Factors in Discovery Decision
- No alignment awareness (heretics should discover eagerly)
- No VP position awareness (leaders should rush, trailers stall)
- No event awareness (Race to Discovery, Royal Patronage)
- No chain flip risk assessment

---

## Actions Phase Analysis

### The turnComplete Death Spiral

Diagnostic from P0 Round 1:
```
Iter 1: gold=10 couns=4 → valid=113 → counsellor action (1 move)
Iter 2: gold=9  couns=3 → valid=7   → turnComplete=true, only convertMonarch + sendAgit
Iter 3: gold=7  couns=1 → valid=5   → sendAgitators only
Iter 4: gold=5  couns=1 → valid=4   → sendAgitators only
Iter 5: gold=3  couns=1 → valid=3   → sendAgitators only
Iter 6: gold=1  couns=1 → valid=0   → PASS (exits entire phase)
```

### Root Cause
1. After ONE counsellor action, `turnComplete = true`
2. All `costsCounsellor` moves fail `validateMove()` (correct game behavior — 1 action per turn)
3. Only sendAgitators (no counsellor cost, 2g each) and convertMonarch remain valid
4. sendAgitators scores 0.087 > pass at 0.0 → bot agitates all 5 rivals
5. Bot calls `pass` instead of `confirmAction` → exits ENTIRE actions phase
6. Should call `confirmAction` to end turn and come back for another counsellor action

### Key Distinction: pass vs confirmAction
- `pass` → `passed = true` + endTurn/endPhase → DONE for entire actions phase
- `confirmAction` → endTurn() → come back for another turn in the next cycle
- `turn.onBegin` resets `turnComplete = false` when the player's turn comes back

### Gold Drain
- 5 agitators x 2g = 10g per round on agitators
- Starting gold ~10-14, tax income ~6-8/round
- After agitators, bot has 0-4g left for next turn's counsellor action
- Many counsellor actions cost 1-5g → bot can't afford them

---

## VP Analysis (single game)

| Player | R1 VP | R4 VP | R6 VP | Final VP | Alignment |
|--------|-------|-------|-------|----------|-----------|
| P0 | 10 | 27 | 45 | — | heretic (converted R2) |
| P1 | 10 | 14 | -4 | — | heretic (converted R3) |
| P2 | 10 | -3 | -17 | — | orthodox |
| P3 | 10 | 9 | -7 | — | orthodox→heretic |
| P4 | 10 | -1 | 1 | — | orthodox→heretic |
| P5 | 10 | -4 | -8 | — | orthodox |

### Observations
- P0 dramatically ahead (45 VP at R6 vs next best 1 VP)
- Negative VPs indicate bots losing VP from events/curses without gaining any from buildings/trade
- Human competitive benchmark: leader should be 52-65 VP at R5. P0 at 45 is reasonable; everyone else is catastrophically behind.
- No buildings = no VP from construction, no trade gains scoring, no legacy card progress

---

## Comparison with Strategy Guide Expectations

### Round 1 — Guide vs Bot

| Action | Guide Says | Bot Does |
|--------|-----------|----------|
| Purchase skyships | 2-4 (4-8g) | 0 |
| Recruit counsellor | 1 | 0 |
| Discover tiles | 1+ | 0.5 (often passes) |
| Deploy fleet | 1 | 0.02 |
| Claim outpost | 1 | 0 |
| Send agitators | 0 ("avoid") | ~8 per player |
| Buildings | 0 ("avoid R1") | 0 (correct by accident) |

### Quick Check Results
1. Did bot buy skyships R1-2? **NO** (0 purchases across 5 games)
2. Trade route by R3? **NO** (0 routes ever)
3. Factory <= route count? **N/A** (0 of both)
4. Pursuing legacy objective? **NO** (no buildings, no territory)
5. sendAgitators < 15%? **NO** (38% of all moves)
6. Winner VP > 25 in 4 rounds? **YES** (P0 at 27 by R4 — but only 1 of 6 players)

---

## Identified Fixes Needed

1. **Discovery**: lower thresholds + alignment/VP/event awareness
2. **Actions**: prefer `confirmAction` over agitators when `turnComplete = true`
3. **Actions**: round-aware context bonuses (skyships R1, factories R2-3, etc.)
4. **Actions**: gold budgeting (don't drain all gold on agitators)
