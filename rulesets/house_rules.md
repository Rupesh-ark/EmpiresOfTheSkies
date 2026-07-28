# House Rules & Digital Adaptations

The digital game implements **rulebook v4.2 (`eots42.md`) plus ALL Manufactured Rivalry amendments (`eots42_amendments.md`)** — mandatory and optional alike — as a single fixed ruleset. There are no ruleset toggles; "base v4.2 without amendments" is not a playable configuration. The three optional amendment modules (Archprelate Fatigue, Send Agitators, Inquisition Decree) are always active.

Beyond the two rulebook files, the implementation deliberately deviates in the following ways (ratified 2026-07-28):

## Mercy of the Republics (house rule)

Each Taxes phase, players trailing the VP leader receive catch-up gold — 1 Gold per 3 VP behind, scaled by republic support (`stateUtils.ts: calculateMercy`). This mechanic appears in no rulebook; it exists to keep trailing players in the game and is documented on the in-game Rules page.

## Trade-route formation at Retrieve Fleets (digital adaptation)

The physical rules form trade routes by depositing/picking up individual Skyships square-by-square during fleet movement. The digital game instead converts fleet skyships into route markers **at the Retrieve Fleets step**, with placement tiles previewed in the retrieve dialog. This trades per-square micromanagement for one decision point. (Known gaps being fixed: multi-square dispatches can propose non-adjacent trail chains; route markers need an owner-reclaim path.)

## Fortune of War card values (config-driven)

The deck's sword/shield values live in `FOW_CARD_CONFIG` (`packages/game/src/data/gameData.ts`) and the card faces are generated from those values at render time — there is no per-value art to keep in sync. Current deck matches the rulebook: Swords 1–5 ×3, Shields 1–5 ×3, No Effect ×2 (32 cards).
