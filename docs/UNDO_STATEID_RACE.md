# Undo + Move StateID Race Condition

## The Error

```
ERROR: invalid stateID, was=[27], expected=[28] - playerID=[0] - action[purchaseSkyships]
ERROR: invalid stateID, was=[27], expected=[28] - playerID=[0] - action[null]
```

These errors appear in server logs when a player clicks a different action button to switch their counsellor placement. They are **expected behaviour** and not a bug.

## Why It Happens

Every action button calls `clearMoves()` (undo) then immediately fires a new move in the same click handler:

```
onClick → clearMoves(props) → props.moves.recruitRegiments(slot)
            │                        │
            ▼                        ▼
     undo sent to server      move sent to server
     (stateID 27 → 28)        (expects stateID 27, but it's now 28)
```

boardgame.io tracks state versions with sequential IDs. The undo increments the server's stateID before the move arrives, so the move is sent with a stale ID.

## How It Resolves

boardgame.io's client automatically handles this:

1. Server rejects the move with `invalid stateID`
2. Client receives the rejection and syncs to the latest state
3. Client retries the move with the correct stateID
4. Move succeeds

This is boardgame.io's built-in optimistic update / retry mechanism.

## Related Client-Side Issue

The `useValidatedMoves` proxy also runs into a stale-state problem during the same click event. It validates the move against the pre-undo `G` (where `turnComplete === true`), even though `clearMoves` just undid the action.

Fix: `useValidatedMoves.ts` suppresses the `TURN_COMPLETE` error code and lets the move through. Server-side validation in `moveWrapper.ts` still blocks actual double actions. See the comment in `useValidatedMoves.ts` for details.

## When to Worry

These `invalid stateID` errors are **only safe** when they appear in pairs with a successful move shortly after (the retry). If you see repeated failures without a subsequent success, that indicates a real sync problem — investigate the client's WebSocket connection.
