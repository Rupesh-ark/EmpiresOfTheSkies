# Bot Training Log: Baseline Diagnosis

**Session goal:** Diagnose why bots make poor decisions despite 20/20 game completion rate

## Starting State

Self-play games complete reliably but bots play badly:
- Spam sendAgitators 10+ times per turn to same target
- Every election is a 6-way tie (all self-vote)
- Zero fleet deployments, zero buildings, zero military activity
- Scores range from -9 to +9 VP (heresy penalties dominate)

## Diagnostic: Move Distribution (Before Fixes)

Full 4-round, 6-player game:

```
192  sendAgitators       ← 39% of ALL moves
 78  pass
 48  vote                (all self-votes)
 48  chooseEventCard
 24  discoverTile
 20  recruitCounsellors
 16  influencePrelates
 16  convertMonarch
  8  punishDissenters
  8  issueHolyDecree
  4  foundBuildings
  0  deployFleet
  0  purchaseSkyships
  0  buildSkyships
  0  trainTroops
  0  moveFleet
  0  recruitRegiments
```

## Root Causes Identified

### Bug 1: sendAgitators — No Per-Rival Limit

**Rule:** "A player may send at most one Agitator per rival per Round."
**Code:** Neither `sendAgitators.ts` validate nor `enumerate.ts` enforced this.
**Effect:** Since sendAgitators costs 2 gold but no counsellor (it's an "anytime" action), bots spammed it until broke. P3 sent 48 agitators in 4 rounds — 12/round, all targeting player "1".

### Bug 2: Election — Self-Vote Always Wins

The ElectionStrategy scored candidates using personality weights, but the math was rigged:

```
Self-vote score:   0.3 * w.religion + building bonus = ~0.088
Other-vote score:  alignment bonus - military penalty - economy penalty = ~0.01
```

Self-vote always scored highest regardless of cathedral count or vote power. Every election was a 6-way tie, incumbent (or player "0") always won.

**Key insight:** Elections are NOT 1-person-1-vote. Each player directs their cathedral-based vote power to a candidate. Bots with 0 cathedrals were voting for themselves with 0 vote power — completely wasteful.

### Issue 3: Weight Imbalance — recruitCounsellors Dominates

After adding diagnostic logging to ActionsStrategy, here's what P0 (Prelate) sees in Round 1:

```
SCORE  MOVE                FORMULA
0.377  sendAgitators       military*0.15 + leaderBonus(0.15) + context(+0.1)
0.323  recruitCounsellors  base(0.3) + positioning*0.2
0.269  influencePrelates   republic slots: religion*0.2 + repAccess*0.3
0.194  foundBuildings [0]  cathedral: religion*0.4 + legacy*0.2
0.187  deployFleet         territory*0.3 + military*0.2 + positioning*0.15
0.178  purchaseSkyships    military*0.3 + positioning*0.2
0.175  convertMonarch      legacy*0.4 + religion*0.2
0.147  influencePrelates   regular: religion*0.25
0.146  recruitRegiments    base(0.1) + military*0.25
0.136  trainTroops         base(0.1) + military*0.2
0.130  foundBuildings [2]  shipyard: economy*0.2 + positioning*0.15
0.000  pass
```

**Key findings from the diagnostic:**

1. **All moves ARE enumerated** — deployFleet, purchaseSkyships, foundBuildings all appear and pass validation. The problem is purely scoring, not availability.

2. **sendAgitators (0.377) is the #1 action** — leader bonus + context bonus stack on top of the military multiplier. Costs no counsellor, so it's always picked first.

3. **recruitCounsellors (0.323) is #2** — its base value of 0.3 is higher than any dimension-weighted move. Only sendAgitators beats it (because of the stacked bonuses).

4. **The gold budget problem:** 5 agitators × 2g = 10g spent before any counsellor action. Starting gold is 10. After agitators, the bot has 0 gold and can't afford deployFleet (1g), purchaseSkyships, or buildings.

5. **deployFleet (0.187) is actually competitive** — it's above most moves. But the bot never reaches it because agitators and recruitCounsellors consume all resources first.

## The Core Tension

The `moveValues` config has two types of scores:
- **`base`**: personality-independent (every bot values it equally)
- **`dimension * weight`**: personality-dependent (Conqueror values military moves more)

`recruitCounsellors` has base 0.3 — a fixed floor that dominates all dimension-weighted moves. With balanced weights (~0.13 each), even `territory*0.3 + military*0.2 + positioning*0.15` only sums to 0.085.

The fix needs to:
1. Lower sendAgitators scoring (reduce leader bonus, remove context stacking)
2. Lower recruitCounsellors base OR add bases to competing moves
3. Ensure gold isn't exhausted on agitators before counsellor actions

## Fixes Applied This Session

### Fix 1: sendAgitators One-Per-Rival (Rule Enforcement)

- Added `agitatorsSentThisRound: string[]` to PlayerInfo
- Validate rejects repeat targets, tracks on success
- Enumerate filters already-targeted rivals
- Reset phase clears tracker each round
- Frontend: greyed-out rival buttons with "(Sent)", freeDissenters display added

**Result:** sendAgitators dropped from 192 → 89 (one per rival per round, legal)

### Fix 2: Election Strategy (Strategic Voting)

- Extracted `calculateVotePower(G, playerID)` helper from vote.ts
- Rewrote ElectionStrategy: estimate election outcome, vote self if winnable, otherwise vote for lowest-VP candidate who can beat the leader
- Prelate personality modifier: lower threshold for self-voting

**Result:** Elections now contested — cross-voting observed, different players win Archprelate

### Fix 3: Weight Tuning (TODO — Next)

Still needed. Move distribution after fixes 1-2:

```
89  sendAgitators       ← legal but still #1 priority
39  pass
24  vote                (now with cross-voting!)
24  chooseEventCard
17  discoverTile
 8  recruitCounsellors
 8  punishDissenters
 8  convertMonarch
 6  influencePrelates
 4  issueHolyDecree
 2  foundBuildings
 0  deployFleet         ← still zero
 0  purchaseSkyships    ← still zero
```
