# G.stage / ctx.phase Disassociation

## The Problem

The game tracks "where are we" in **two parallel systems** that are not synchronized:

- **`ctx.phase`** (13 values) — managed by boardgame.io's phase system. Transitions happen via `events.endPhase()`.
- **`G.stage`** (~25 values) — managed manually in move handlers, `onBegin` hooks, and helper functions. Set by direct assignment (`G.stage = "..."`)

`ctx.phase` is the coarse container. `G.stage` is the fine-grained sub-state within it. The frontend's `DialogRouter.tsx` uses `G.stage` (not `ctx.phase`) to decide which dialog to show.

**Nothing enforces that `G.stage` and `ctx.phase` are compatible.** If a move or transition forgets to set `G.stage`, the UI shows the wrong dialog.

## Current Mapping

```
ctx.phase             Valid G.stage values              Set where
─────────────────     ──────────────────────────        ──────────────────────
kingdom_advantage     "discovery" | "reset"             NOT SET — inherits from setup or reset
legacy_card           "pick legacy card"                Game.ts onBegin
events                "events"                          Game.ts onBegin
discovery             "discovery"                       Game.ts onBegin
taxes                 "taxes"                           Game.ts onBegin
actions               "actions"                         Game.ts onBegin
                      "confirm_fow_draw"                trainTroops.ts, drawFoWCards.ts
                      "discard_fow"                     drawFoWCards.ts
                      "attack or pass"                  pass.ts (all players passed)
aerial_battle         "attack or pass"                  findNext.ts:findNextBattle
                      "attack or evade"                 attackOtherPlayersFleet.ts
                      "resolve battle"                  defendGroundAttack.ts (shared)
                      "relocate loser"                  evadeAttackingFleet.ts, resolveBattle.ts
plunder_legends       "plunder legends"                 findNext.ts:findNextPlunder, Game.ts onBegin
                      "attack or pass"                  findNext.ts (on phase exit)
ground_battle         "attack or pass"                  findNext.ts:findNextGroundBattle
                      "defend or yield"                 attackPlayersBuilding.ts
                      "resolve battle"                  defendGroundAttack.ts
                      "garrison troops"                 resolveBattle.ts
                      "relocate loser"                  resolveBattle.ts
                      "conquest"                        findNext.ts (on phase exit)
conquest              "attack or pass"                  Game.ts onBegin
                      "conquest"                        findNext.ts:findNextConquest
                      "conquest draw or pick card"      coloniseLand.ts
                      "garrison troops"                 constructOutpost.ts, resolveBattle.ts
                      "election"                        findNext.ts (on phase exit)
election              "election" | "attack or pass"     NOT SET — inherits from conquest exit
                      | "conquest"
resolution            "infidel_fleet_combat"            Game.ts onBegin (via prepareInfidelFleetCombat)
                      "deferred_battle"                 resolutionFlow.ts
                      "rebellion"                       resolutionFlow.ts, commitRebellionTroops.ts,
                                                        contributeToRebellion.ts
                      "rebellion_rival_support"         commitRebellionTroops.ts
                      "invasion_nominate"               resolutionFlow.ts
                      "invasion_contribute"             nominateCaptainGeneral.ts
                      "invasion_buyoff"                 contributeToGrandArmy.ts
                      "retrieve fleets"                 resolutionFlow.ts, contributeToGrandArmy.ts,
                                                        offerBuyoffGold.ts
reset                 "reset" | "retrieve fleets"       NOT SET — inherits from resolution exit
```

## Phases That Don't Set G.stage

These phases inherit `G.stage` from the previous phase's exit, which is fragile:

1. **kingdom_advantage** — inherits "discovery" (round 1 from setup) or "reset" (from reset phase)
2. **election** — inherits whatever conquest's exit set (usually "election" from findNextConquest, but could be "attack or pass" or "conquest")
3. **reset** — inherits "retrieve fleets" from resolution

## Shared Stage Values Across Phases

These `G.stage` values appear in multiple phases, creating ambiguity:

| G.stage            | Used in phases                                      |
|--------------------|-----------------------------------------------------|
| `"attack or pass"` | actions, aerial_battle, plunder_legends, ground_battle, conquest, election |
| `"resolve battle"` | aerial_battle, ground_battle                        |
| `"relocate loser"` | aerial_battle, ground_battle                        |
| `"garrison troops"`| ground_battle, conquest                             |
| `"conquest"`       | ground_battle (exit), conquest, election (inherited) |

`DialogRouter.tsx` renders both `AttackOrPassDiaLog` (aerial) and `GroundAttackOrPassDialog` (ground) when `G.stage === "attack or pass"`. They must internally distinguish phase.

## Debug Assertion

A runtime check in `moveWrapper.ts` (`checkStagePhaseSync`) validates every move call against the `VALID_STAGES` map. Desyncs log to the `stage-desync` logger as errors. They do NOT block the move — warning only.

## Proper Fix (Future Work)

Replace the flat `G.stage` string with a discriminated union scoped to each phase:

```typescript
type GameStage =
  | { phase: "actions"; sub: "default" | "confirm_fow_draw" | "discard_fow" }
  | { phase: "aerial_battle"; sub: "attack_or_pass" | "attack_or_evade" | "resolve" | "relocate" }
  | { phase: "ground_battle"; sub: "attack_or_pass" | "defend_or_yield" | "resolve" | "garrison" | "relocate" }
  | { phase: "conquest"; sub: "attack_or_pass" | "conquest" | "draw_or_pick" | "garrison" }
  | { phase: "resolution"; sub: "infidel_fleet" | "deferred_battle" | "rebellion" | "rebellion_rival" | "invasion_nominate" | "invasion_contribute" | "invasion_buyoff" | "retrieve_fleets" }
  | { phase: "discovery" }
  | { phase: "taxes" }
  | { phase: "events" }
  | { phase: "election" }
  | { phase: "legacy_card" }
  | { phase: "kingdom_advantage" }
  | { phase: "reset" };
```

This makes impossible states unrepresentable — you can't have `sub: "rebellion"` during the `actions` phase.

### Migration steps:

1. Replace `G.stage: string` with `G.stage: GameStage` in types.ts
2. Update all ~40 `G.stage = "..."` assignments to use the new shape
3. Update `DialogRouter.tsx` to match on `G.stage.phase` + `G.stage.sub`
4. Update all test fixtures
5. Remove the `VALID_STAGES` debug assertion (no longer needed — TypeScript enforces it)

Estimated effort: 2-3 days. Touch points: ~40 stage assignments, DialogRouter, 44 test files.
