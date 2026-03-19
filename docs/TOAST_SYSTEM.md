# Toast System — Why Client-Side Validation?

## The Problem

boardgame.io v0.50 provides **no mechanism for move rejection feedback** to the client.
This is a known open issue in the framework since 2019:

- [Issue #723 — Improve client error handling](https://github.com/boardgameio/boardgame.io/issues/723)
- [Issue #592 — Caller needs to know whether move returned as INVALID_MOVE](https://github.com/boardgameio/boardgame.io/issues/592)

When a move is rejected, the player sees **nothing** — no error message, no toast, no feedback.

## What We Tried

### Approach 1: Write errors to G.moveError, return INVALID_MOVE

**Problem:** boardgame.io rolls back the entire `G` state when a move returns `INVALID_MOVE`.
The error is written to `G.moveError`, then immediately wiped by the rollback before the
client ever receives it.

### Approach 2: Write errors to G.moveError, return normally (no INVALID_MOVE)

**Problem:** boardgame.io treats the move as a successful state change. This creates undo
entries for moves that didn't actually do anything, causing `"No moves to undo"` errors
on subsequent interactions. The move also counts as a turn action even though nothing happened.

### Why G state cannot carry error messages

Both approaches fail because boardgame.io controls `G`:
- `INVALID_MOVE` → full rollback (error wiped)
- Normal return → treated as successful move (undo/turn side effects)

There is no middle ground in boardgame.io's move pipeline.

## boardgame.io's Official Recommendation

From Issue #592, the maintainers recommend:

> "Create a (hopefully pure) shared function that's called by both your UI
> and your move implementation."

## Our Solution

Each move exports a `MoveDefinition` contract with an optional `validate` function:

```typescript
type MoveDefinition = {
  fn: (context: MoveContext, ...args: any[]) => any;
  errorMessage: string;
  validate?: (G: MyGameState, playerID: string, ...args: any[]) => MoveError | null;
  successLog?: (G: MyGameState, playerID: string, ...args: any[]) => string | null;
};
```

The frontend calls `validate` before invoking the move. If validation fails, a toast is
shown and the move is never sent to the server. The server still runs the same `validate`
inside `wrapMove` as a safety net.

This follows boardgame.io's recommendation exactly — shared validation functions used by
both the UI and the move implementation. No duplication, no separate frontend logic.

## Two Categories of Rejection

1. **boardgame.io rejects** (wrong turn, wrong phase) → `"disallowed move"` in console.
   Our code never runs. The frontend guards against this by checking turn/phase before
   calling moves.

2. **Game logic rejects** (slot taken, not enough gold, etc.) → `validate` returns a
   `MoveError`. The frontend shows the error message as a toast.
