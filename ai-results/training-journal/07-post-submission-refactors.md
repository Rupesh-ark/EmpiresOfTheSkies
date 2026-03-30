# Post-Submission Refactors

Technical debt items identified during bot training. Not blocking for submission but should be addressed after.

---

## 1. Replace `G.stage` String with Discriminated Union (Fixed)

**Problem:** `G.stage` is a flat string shared across 13 phases. Values like `"attack or pass"` appear in 6 different phases, creating ambiguity. The `checkIfCurrentPlayerIsInCurrentBattle` function needs phase+stage to route correctly, and bugs arise when stage values are stale from a previous phase.

**Proposed fix:** Replace `G.stage: string` with a discriminated union scoped to each phase:

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

This makes impossible states unrepresentable — TypeScript enforces that `sub: "rebellion"` can only exist during the `resolution` phase.

**Changes required:**
- Replace `G.stage: string` with `G.stage: GameStage` in types.ts
- Update ~40 `G.stage = "..."` assignments to use the new shape
- Update `DialogRouter.tsx` to match on `G.stage.phase` + `G.stage.sub`
- Update `checkIfCurrentPlayerIsInCurrentBattle` (simplifies significantly — no phase checking needed)
- Update `enumerate.ts` stage checks
- Update all test fixtures
- Remove the `VALID_STAGES` debug assertion (TypeScript enforces it)

**Estimated effort:** 2-3 days. Touch points: ~40 stage assignments, DialogRouter, enumerate, 44 test files.

---

## 2. Fix `endTurn`/`endPhase` in `phase.onBegin` Pattern (Fixed by doing by refacoring the resolution phase)

**Problem:** boardgame.io silently discards `endTurn()` and `endPhase()` called inside `phase.onBegin`. Our codebase has multiple workarounds for this — `turn.onBegin` redirects, `skipEndTurn` flags, and the `stageMatchesPhase` guard in `checkIfCurrentPlayerIsInCurrentBattle`.

**Current workarounds:**
- `continueResolution(G, events, skipEndTurn=true)` — skips endTurn in phase.onBegin
- `checkIfCurrentPlayerIsInCurrentBattle` — redirects in turn.onBegin
- `getResolutionTarget()` — provides redirect targets for turn.onBegin
- `stageMatchesPhase` guard — detects when phase.onBegin's endPhase was discarded

**Proposed fix:** Systematically move ALL game logic that calls `endTurn`/`endPhase` out of `phase.onBegin` and into `turn.onBegin` or a dedicated setup hook. The pattern:

```typescript
// BEFORE (broken):
phase.onBegin: findNextBattle(G, events); // calls endTurn — discarded!

// AFTER (correct):
phase.onBegin: setupPhaseState(G); // only mutate G, no events
turn.onBegin: routeToCorrectPlayer(G, ctx, events); // endTurn works here
```

**Changes required:**
- Audit all `phase.onBegin` hooks for `endTurn`/`endPhase` calls
- Move event-triggering logic to `turn.onBegin`
- Remove `skipEndTurn` flags and `stageMatchesPhase` guard (no longer needed)
- Document the pattern in CLAUDE.md for future development

**Estimated effort:** 1-2 days. High value — eliminates an entire class of bugs.

**Depends on:** boardgame.io may fix this upstream (issue filed). If so, the workarounds become unnecessary. But the pattern of separating state setup from turn routing is good practice regardless.
