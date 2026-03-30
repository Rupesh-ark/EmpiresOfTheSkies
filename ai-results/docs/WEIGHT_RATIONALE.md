# AI Weight System Rationale

This document explains how the AI weight values were derived and why they take their current form. The system has three layers, each with a distinct justification methodology.

## Architecture Overview

```
Layer 1: Baseline Weights (equal-prior principle)
    │
    ├── Card Shifts (game-design-driven)
    │
    ├── Eval Params (rules-arithmetic-driven)
    │
    └── Move Values (playtesting-driven)
```

---

## 1. Baseline Weights

**Principle:** Without information, no strategy should be preferred.

| Dimension      | Weight | Rationale |
|----------------|--------|-----------|
| territory      | 0.13   | Scoring dimension (VP from colonies/outposts) |
| economy        | 0.13   | Scoring dimension (gold enables all actions) |
| military       | 0.13   | Scoring dimension (combat, conquest, defense) |
| religion       | 0.13   | Scoring dimension (archprelate VP, buildings) |
| legacy         | 0.13   | Scoring dimension (legacy card VP at game end) |
| republicAccess | 0.13   | Scoring dimension (mercy mechanism for trailing players) |
| positioning    | 0.11   | Support dimension (fleet readiness, counsellor availability) |
| threats        | 0.11   | Support dimension (defensive posture, vulnerability) |

The near-equal distribution mirrors the game's design intent: before cards are dealt, all victory paths are equally viable. Positioning and threats receive slightly lower weights (0.11 vs 0.13) because they are reactive support dimensions rather than direct scoring mechanisms. They contribute to winning indirectly by enabling or protecting scoring actions.

---

## 2. Card Shifts

**Principle:** Each card's shift magnitude reflects its mechanical impact on gameplay.

### Magnitude Scale

| Shift     | Meaning                          | Examples |
|-----------|----------------------------------|----------|
| +0.15     | Major identity — defines strategy | "the conqueror" +territory, "the merchant" +economy |
| +0.12     | Strong specialisation — card's primary mechanic | elite_regiments +military, licenced_smugglers +economy |
| +0.08     | Secondary benefit — helps but doesn't define | "the conqueror" +military, improved_training +military |
| +0.03–0.05| Minor synergy or political side-effect | patriarch_of_the_church +republicAccess |
| -0.03–0.05| Trade-off — the card's weakness | sanctioned_piracy -republicAccess (piracy is politically unpopular) |

### Kingdom Advantage Cards

| Card                     | Shifts                           | Rationale |
|--------------------------|----------------------------------|-----------|
| elite_regiments          | military +0.12                   | Card grants superior troops — direct military advantage |
| improved_training        | military +0.08                   | Better training — moderate military improvement |
| licenced_smugglers       | economy +0.12                    | Trade licence — strong economic specialisation |
| more_efficient_taxation  | economy +0.08, repAccess -0.05   | Better tax revenue, but taxation reduces republic goodwill |
| more_prisons             | religion +0.10                   | Prisons suppress dissent — moderate religious control |
| patriarch_of_the_church  | religion +0.12, repAccess +0.03  | Church leadership — strong religious identity with political influence |
| sanctioned_piracy        | military +0.05, economy +0.08, repAccess -0.03 | Dual military/economic benefit, but piracy damages diplomacy |

### Legacy Card Name Shifts

| Card            | Shifts                        | Rationale |
|-----------------|-------------------------------|-----------|
| the conqueror   | territory +0.15, military +0.08 | Conquest-focused — needs territory and army |
| the navigator   | territory +0.12, positioning +0.05 | Exploration-focused — territory through discovery |
| the merchant    | economy +0.15, territory +0.05 | Trade empire — economy with territorial reach for routes |
| the mighty      | military +0.15, threats +0.05 | Military dominance — strong army with defensive awareness |
| the pious       | religion +0.15               | Religious victory — pure faith focus |
| the magnificent | religion +0.12               | Grandeur through religious buildings |
| the builder     | territory +0.08, religion +0.05 | Infrastructure — buildings score both territory and faith |
| the aviator     | military +0.08, positioning +0.08 | Fleet mastery — balanced air power and fleet readiness |
| the great       | (no shift)                    | Generalist — no specialisation, adaptable |

### Legacy Alignment Shifts

| Condition              | Shifts            | Rationale |
|------------------------|-------------------|-----------|
| Purple card + heretic  | repAccess +0.08   | Heretic with purple card benefits from republic mercy mechanic |
| Orange card + orthodox | repAccess +0.10   | Orthodox with orange card — strong republic alignment synergy |
| "the magnificent"      | repAccess +0.08   | Magnificent rulers attract republic support |
| "the pious"            | repAccess -0.05   | Extreme piety alienates secular republics |

### Calibration Target

Card shifts were calibrated so that a single card shifts the dominant weight from ~0.13 to ~0.20–0.25 after normalisation. This creates distinct play styles (a "Conqueror" clearly prioritises territory) without making other dimensions irrelevant (economy still matters at ~0.10).

---

## 3. Eval Parameters

**Principle:** Direct translation of game rules arithmetic into numerical equivalences.

| Parameter            | Value | Source |
|----------------------|-------|--------|
| colonyWeight         | 1.5   | Colonies yield ~50% more loot and VP than outposts |
| fortWeight           | 0.5   | Forts are defensive only — no direct VP |
| routeWeight          | 0.3   | Trade routes generate passive income but require factories |
| factoryIncomeValue   | 3     | An engaged factory generates ~3 gold equivalent per round |
| unengagedPenalty     | 2     | Factories without trade routes are a wasted investment |
| levyWeight           | 0.5   | Levies roll 1 die in combat vs 2 for regular regiments |
| eliteWeight          | 1.5   | Elite regiments roll 3 dice vs 2 for regulars |
| skyshipWeight        | 1.5   | Skyships provide both mobility and combat strength |
| archprelateBonus     | 0.3   | Being archprelate grants VP and religious influence |
| fatigueFactor        | 0.3   | Consecutive archprelate wins reduce the bonus (diminishing returns) |
| buildingBonus        | 0.08  | Each cathedral/palace provides a small ongoing advantage |
| dissenterPenalty     | 0.05  | Free dissenters are a liability — negative religious standing |
| maxReasonableVP      | 20    | Practical ceiling for legacy card VP (used for normalisation) |
| earlyGameWeight      | 0.3   | Legacy scoring is speculative early — low confidence |
| lateGameWeight       | 0.7   | Legacy scoring is locked in late — high confidence |
| mercyVPGapScale      | 20    | VP gap at which mercy becomes maximally relevant |

These are not tuned parameters. They are mechanical translations: if the game rules say levies fight at half strength, `levyWeight = 0.5`. If colonies give roughly 50% more rewards, `colonyWeight = 1.5`.

---

## 4. Move Values

**Principle:** General desirability of each action, independent of game state.

Move values combine a `base` (how good is this move in a vacuum) with personality-scaled multipliers (how much more valuable is it for a specialised bot).

### Base Value Scale

| Range      | Meaning | Examples |
|------------|---------|----------|
| 0.15–0.18  | Almost always valuable | recruitCounsellors (0.18) — counsellors enable all actions |
| 0.10–0.12  | Generally good | deployFleet (0.12), trainTroops (0.12) |
| 0.06–0.08  | Situational | purchaseSkyships (0.08), shipyard (0.04) |
| 0.02–0.05  | Rarely correct | sell (0.05), transferOutpost (0.02) |
| 0.00       | Only as last resort | pass (0.0) |

### Personality Multipliers

Multipliers are keyed to the 8 weight dimensions. A bot with high military weight gets more value from military-adjacent moves:

```
attack:              military × 0.35 + territory × 0.15
deployFleet:         territory × 0.30 + military × 0.20 + positioning × 0.15
coloniseLand:        territory × 0.50 + legacy × 0.20
cathedralOrthodox:   religion × 0.40 + legacy × 0.20
```

The multiplier magnitudes (0.15–0.50) were set so that personality differences create meaningful move preference divergence: a Conqueror (territory ~0.23) scores `coloniseLand` at ~0.12 + 0.23×0.50 + 0.10×0.20 = 0.255, while a Prelate (territory ~0.10) scores it at ~0.12 + 0.10×0.50 + 0.13×0.20 = 0.196.

### Derivation Method

Move values were initially set uniformly at 0.1, then adjusted through iterative self-play observation:

1. Run batch games and observe move distribution
2. Identify moves that are over- or under-represented vs expert play
3. Adjust base values and multipliers to correct the distribution
4. Re-run and verify

This is an ongoing calibration process, not a one-time derivation.

---

## 5. Additional Parameters

| Parameter          | Value | Rationale |
|--------------------|-------|-----------|
| jitterRange        | 0.1   | ±5% random variation per dimension — prevents identical play between bots with the same cards |
| minWeight          | 0.01  | Floor prevents any dimension from reaching zero (always some consideration) |
| tacticalMultiplier | 2.5   | Converts dimension weights to tactical preferences (e.g., military 0.20 × 2.5 = 0.50 aggression) |

---

## Summary

The weight system separates **game knowledge** (eval params derived from rules) from **strategic preference** (card shifts derived from card design) from **tactical valuation** (move values refined through self-play observation). This separation makes each layer independently justifiable and testable.
