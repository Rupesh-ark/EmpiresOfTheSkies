# Rulebook Conformance Audit — 2026-07-28

Static audit of the engine (`packages/game/src`) and the redesigned frontend (`empires_of_the_skies/src`) against `rulesets/eots42.md` (base v4.2) and `rulesets/eots42_amendments.md` ("Manufactured Rivalry"). Eight parallel domain audits: events/rebellions/invasion, actions phase, resolution (non-combat), battle system, discoveries/taxes/scoring/heresy, setup/components/cards, fleets/map interaction, and sequence-of-play/anytime/deals/variants chrome. **Report only — nothing has been fixed.**

Severity: **RB** = rules-breaking (plays wrong / allows illegal / blocks legal), **MISL** = UI shows wrong info, **MISS** = rulebook feature absent or unsurfaced, **MIN** = minor/ambiguity.

---

## Which ruleset does the game target?

**Base v4.2 + ALL Manufactured Rivalry amendments (mandatory AND optional), hardwired on with no toggle.** `filterKAPool`/`seedLegacyDeal`/`classifyEventDeck` run unconditionally (`Game.ts:209,290-296`, `pickKingdomAdvantageCard.ts:35-47`); the three *optional* modules (Archprelate Fatigue, Send Agitators, Inquisition decree) are always enabled; none of the base rulebook's own variants (Short Game, Smaller World, Peaceful, etc.) exist; game length is fixed at 6 rounds. Nothing in the lobby or UI tells players which ruleset they're playing, and nothing records which optional rules were deliberately adopted. Additionally the engine plays one mechanic in **no** ruleset: "Mercy of the Republics" catch-up gold (`Game.ts:425`, `stateUtils.ts:182-215`) — documented on the RulesPage but sanctioned by neither rulebook file.

---

## Cross-cutting themes

1. **No `playerView` anywhere.** Every client receives the full hidden state: undiscovered tile identities, all FoW hands, legacy picks/options, ballots-in-progress, face-down event cards, deck order. All hidden information is honor-system-only (devtools reads it). The July DOM leak fix (tile faces) is confirmed still in place — but it's render-layer only.
2. **Server-side validation holes.** `retrieveFleets` (no validator; client-supplied ids dereferenced), `deployFleet` (elite-laden fleets validate as unladen → free mountain crossing; away-from-home fleets skip resource checks but still debit), `garrisonTroops` (no cap/negative guard — mints troops), `pickLegacyCard` (accepts any card, not the 3 dealt), `passFleetInfoToPlayerInfo` (no 5-skyship cap), `sendAgitators` (no gold validation).
3. **Player choices the rulebook grants are auto-resolved by the engine.** Loss apportionment, Infidel Corsairs building loss, Infidels-Invade-Faerie target, Allies-in-Faerie quantities, election winner's Archprelate-recipient choice, smuggler good choice (engine move exists, no UI), per-shipyard build rates, decline-to-flip in discovery.
4. **Tooltip/copy drift is systemic.** `ActionHoverContext.tsx` is wrong for ~10 actions (some describe a different action entirely); `RulesPage.tsx` teaches several rules the engine doesn't implement (per-route cut choice, 4-square movement, FoW shields 1–5) and omits always-on adopted rules; heresy VP labeled "at game end" on three surfaces though it scores every round.
5. **The invasion/Grand Army and rebellion subsystems are the furthest from the rulebook** — inverted win condition, casualties never applied, missing aerial phase, wrong targets, wrong loss distribution.
6. **Two likely soft-locks in battle flow** (ground-defender FoW dialog never opens; retreat destination validator rejects everything the UI offers when no adjacent tile is empty).

---

## Priority shortlist

Likely soft-locks / unreachable mandatory decisions:
- **B13** ground-battle defender has no way to play a FoW card — flow stalls.
- **B12** retreat/evade destination: UI offers tiles the validator rejects (non-adjacent, mountain edges); soft-lock when no adjacent tile is empty.
- **F4** a fleet emptied by transfer is stranded forever (normal consolidation loses a fleet slot for the game).

Highest-impact correctness (systemic, every game):
- **B1** FoW Shield cards are 4–8, rulebook says 1–5 (every battle skewed to defense; RulesPage says 1–5).
- **A9/F1** fleet movement capped at 3 squares; rulebook allows 4 (RulesPage says 4).
- **SC1** Trade Gains ranking counts goods only, never gold — gold-heavy traders under-ranked for the 3/6/9/12 VP awards (a conformance test pins the wrong behavior).
- **A1** Issue Holy Decree consumes no counsellor and no action — free extra action for the Archprelate every round.
- **E1–E4** Grand Army: inverted win condition, casualties never applied, aerial phase missing (UI can't even send skyships), army doesn't scale with player count.
- **B6/B7/B8** ground-battle ownership/claim defects incl. two VP farms (attack undefended buildings; re-claim your own outpost every round).
- **SC2** discovery chain-flip is forced; rulebook allows declining (Pass is offered but rejected).

---

## Findings by domain

### 1. Setup, components, Legacy & Kingdom Advantage cards

- **S1 (RB)** FoW Shields 4–8 vs rulebook 1–5 (`eots42.md:663`; `gameData.ts:222-226`; UI mirrors: `assets/fortuneOfWarCards.ts:24-30`, only 4–8 shield art exists). = B1.
- **S2 (RB)** Wrong-allegiance Legacy penalty rounds in player's favor: engine `ceil(V/2)` kept, rulebook net = `floor(V/2)` (`eots42.md:819`; `legacyCardDefinitions.ts:169`).
- **S3 (RB)** "The Merchant" scores against fleets, ignoring `routeSkyships` — but legacy scoring runs after fleets retrieve home, so it scores ~0 (`eots42.md:804`; `legacyCardDefinitions.ts:9-39`; `resolveRound.ts:291-293`).
- **S4 (RB)** "The Aviator"/"The Great" skyship counts omit route-marker skyships (`eots42.md:803`; `legacyCardDefinitions.ts:151-155,84-85`; `retrieveFleets.ts:48-54`).
- **S5 (RB)** "The Mighty"/"The Great" exclude garrisoned regiments (`eots42.md:808-813`; `legacyCardDefinitions.ts:135-149,86-87`).
- **S6 (RB)** `pickLegacyCard` accepts any card — no check against the 3 dealt, no validator (`moves/pickLegacyCard.ts:5-17`).
- **S7 (RB)** No `playerView` — legacy picks/options, FoW + event hands on the wire (`eots42.md:795,884`). = theme 1.
- **S8 (RB)** Nuclear-combo counter swap ignores the KA half of the counter combination; swaps to first other player regardless (`eots42_amendments.md:60-69`; `manufacturedFunSeed.ts:183-203`).
- **S9 (MISL)** Holdings panel looks up tiles with swapped coordinates — wrong names ("Unknown Waters" for x ≥ 4) and impossible grid refs (`Holdings.tsx:26` passes `[y,x]`; `locationLabels.ts:41` expects `[x,y]`).
- **S10 (MIN)** 4-player KA pool: engine removes a whole pair (keeps MET); amendment says remove 2 singles from different groups — amendment self-contradictory, engine resolved silently (`eots42_amendments.md:24,30`; `manufacturedFunSeed.ts:42-48`).
- **S11 (MIN)** Seeded deal at 5–6 players: pool β (4 cards) can't serve everyone; engine falls back to γ — players 5–6 silently lose the guaranteed Religious option (`eots42_amendments.md:47`; `manufacturedFunSeed.ts:95-116`).
- **S12 (MIN)** "More Prisons" registry text adds "or execute" not in rulebook (`eots42.md:841-842`; `kaCardDefinitions.ts:36`).
- **S13 (MIN)** "The Great" trade-gains category uses a third, connectivity-free definition of Trade Gains; registry says "Trade Goods" (`legacyCardDefinitions.ts:100-117`).
- **S14 (MIN)** Shared physical supplies (forts, outpost/colony counters, dissenter cubes, gold bank) have no global caps; per-player caps are all correct.

Conforming (verified): map 8×4 + Known World layout + tile mix; starting resources; KA draft order; 18 legacy cards with correct color split; card registry text matches rulebook and is single-sourced into UI; dock capacities (4 FoW, 5 berths, 3 shipyards) correct.

### 2. Actions phase (action board + kingdom boards)

- **A1 (RB)** Issue Holy Decree: no counsellor, no action consumed, usable with zero counsellors or after acting (`eots42.md:161,203,227`; `issueHolyDecree.ts:13-24,66-110`).
- **A2 (RB)** Inquisition decree free — amendment charges 2 Gold (`eots42_amendments.md:209`; `issueHolyDecree.ts:94-105`).
- **A3 (RB)** Self-Inquisition allowed — amendment forbids (`issueHolyDecree.ts:54-61`; UI includes self: `HolyDecreeDialog.tsx:215-219`).
- **A4 (RB)** Agitator scoring shift always advances heresy; must retreat for Heretic rival — inverts the punishment into a gift (`eots42_amendments.md:195`; `resolveRound.ts:180-188`). = X1.
- **A5 (RB)** Executing prisoners skips the Punish Dissenters payment (`eots42.md:254,260`; `punishDissenters.ts:78-92`; tooltip codifies it).
- **A6 (RB)** Cannot imprison AND execute in one Punish action; rulebook allows both (`eots42.md:256`; `punishDissenters.ts:26-29,70-117`).
- **A7 (RB)** Counsellor-as-payment actions don't require a second available counsellor — off-by-one drives counsellors below actions taken (`eots42.md:254,286`; `moveValidation.ts:14`; `convertMonarch.ts:39-40`).
- **A8 (RB)** "Found Fort … or in your Kingdom" option missing (`eots42.md:223`; `checkAndPlaceFort.ts:10-21`).
- **A9 (RB)** Fleet movement 3 squares, not 4 — engine BFS, pricing, and dock cost map all agree on the wrong number; RulesPage says 4 (`eots42.md:294,302`; `helpers.ts:33`; `PlayerDock.tsx:65-69`; `RulesPage.tsx:293,341`). = F1.
- **A10 (RB)** Elite-only fleet counts as unladen in deploy validation → mountain crossing at cost 0 (`deployFleet.ts:85` vs `:122-147`). = F2.
- **A11 (RB)** Conscript Levies cap ignores levies aboard fleets/garrisons — can exceed the 12-cube supply (`eots42.md:288`; `conscriptLevies.ts:29-35`; contrast `stateUtils.ts:77-102`).
- **A12 (RB)** Build Skyships forces a uniform rate across shipyards; rulebook is per-yard 1-or-2 (`eots42.md:252`; `buildSkyships.ts:26-37`; dialog offers only the two uniform totals).
- **A13 (MIN)** One-Fort-per-Land enforced only per player (`eots42.md:223`; `checkAndPlaceFort.ts:13,31`).
- **A14 (MIN)** Influence Prelates rival bribe paid to the rival, not the bank — rulebook silent; materially changes the economy (`eots42.md:225`; `actionCosts.ts:50-80`).
- **A15 (MIN)** sendAgitators bypasses gold validation + Lenders-Refuse gate (`sendAgitators.ts:30`).
- **A16 (MIN)** Dead `SLOTS_*` constants (`gameData.ts:129-136`) — either a missing slot-capacity rule or drift bait.
- **A17 (MIN, AI)** enumerate.ts: Influence Prelates off-by-one (slot 1 never taken, nonexistent slot 9 legal); Punish enumeration passes numPlayers as count (AI never imprisons at high player counts); empty Holy Decree enumerated and silently accepted (`enumerate.ts:254-303`; `punishDissenters.ts:120`).

UI (actions):
- **A18 (MISL)** Tooltips wrong across the board (`ActionHoverContext.tsx`): Train Troops describes elite conversion (:150-155); Conscript Levies "Free" (:144-149); Build Skyships wrong on cost/quantity/action (:138-143); Influence Prelates invents order-based pricing (:117-122); cathedral/palace effects backwards or omitted (:93-104); stacking "per player" vs per counsellor (:60-72); Dispatch Fleet "Free"/"moves at start of Battle phase" (:132-137,156-161); factory "build in territories" (:75-79).
- **A19 (RB-UI)** Curse target list narrower than legal — only max-tracker heretics clickable; engine accepts any heretic (`eots42.md:229`; `HolyDecreeDialog.tsx:213,242-245`). Dialog also says Curse rounds *down* (rulebook/engine: up, max 3) and omits Inquisition + its fee (`HolyDecreeDialog.tsx:32,45-52`).
- **A20 (RB-UI)** Levy dialog forces multiples of 3, blocks the legal final partial group, offers counts beyond supply (`eots42.md:288`; `KingdomActions.tsx:98-126`).
- **A21 (MISL)** Punish Dissenters row ignores validation — live-looking controls that fail after click (`PunishDissentersRow.tsx:39-53,83-85`).
- **A22 (MISS)** Tax schedule (gold per PO position, engine 4+index) shown nowhere — players pick order blind to the trade-off (`eots42.md:155`; `playerSetup.ts:83-84`; `PlayerOrderRow.tsx`). = SC12.

Conforming: all stacking/building costs single-sourced and correct; caps (counsellors/buildings/skyships/regiments incl. fleet+garrison counting); debt model; heretic cathedral block; palace/cathedral VP+heresy; Player Order slots; prelate slots/votes; convert; train troops; fleet load rules (except A10); taxes modifiers.

### 3. Resolution phase (non-combat)

- **R1 (RB)** Legend goods never move price markers back right after Sell Goods — permanent price depression per plundered legend (`eots42.md:404,478`; `resolveRound.ts:161-163`; `plunder.ts:22`).
- **R2 (RB)** Piracy protection automatic/undeclared, can't protect others, same fleet pirates AND protects — RulesPage states the exclusivity rule the engine ignores (`eots42.md:482`; `piracy.ts:81-111`; `RulesPage.tsx:400-401`).
- **R3 (RB)** Cut the Route is one per-player round-long intent, not per-route at piracy time; RulesPage teaches the amendment, not the engine (`eots42_amendments.md:168-170`; `types.ts:242`; `piracy.ts:137`; `RulesPage.tsx:404-407`). = X6.
- **R4 (MISS)** Election winner never chooses who receives the Archprelate (explicitly dealable choice) (`eots42.md:512`; `vote.ts:123-151`).
- **R5 (MISS)** Retrieve Fleets can't disembark troops at friendly Lands en route (`eots42.md:579`; `retrieveFleets.ts:72-80`). = F14.
- **R6 (RB)** retrieveFleets unvalidated server-side (known item, confirmed) + latent battleMap `splice(indexOf,-1)` bug that removes the wrong player (`retrieveFleets.ts:23-44,90-94`; `moveDefinitions.ts:191`).
- **R7 (MISS)** Licenced Smugglers goods choice has an engine move but no UI — humans always get a random good (`eots42.md:838-839`; `declareSmugglerGood.ts`; `resolveRound.ts:119`).
- **R8 (MISL)** ElectionDialog shows only candidates' cathedral counts, never real vote weight; its `nprCathedrals` lookup indexes by playerID into a name-keyed map (always undefined) (`eots42.md:510`; `ElectionDialog.tsx:37,77,145`; `Game.ts:195-200`).
- **R9 (MISS)** Piracy tax and factory income outcomes invisible — no logs for who paid/received what (`piracy.ts:159-170`; `resolveRound.ts:32-37`; `RoundSummaryDialog.tsx:59-61`).
- **R10 (MIN)** Sanctioned Piracy VP per blocking fleet, not per route (`eots42.md:482`; `piracy.ts:132-169`).
- **R11 (MIN)** Cut targets the rival's first in-network fleet, not the blocking bottleneck — can silently no-op (`piracy.ts:143-148`).
- **R12 (MIN)** Ballots not secret in state (`vote.ts:106-107`; no playerView).
- **R13 (MIN)** Archprelate Fatigue counter conflates same-round emergency + regular elections (`eots42_amendments.md:178`; `immediateElectionVote.ts:153-157`); a dealt token inherits the previous holder's fatigue.
- **R14 (MIN)** TopStrip Resolution hint misorders steps ("piracy, trade") and omits four (`gameData.ts:199`).
- **R15 (MIN)** Route-markers-at-retrieve is an engine extension of the rulebook's dispatch-drop-off mechanic — internally consistent and previewed, but not the book's mechanism (`eots42.md:311-313,577-579`; `retrieveFleets.ts:40-61`). See F13.

Conforming: 12-step resolution order matches the rulebook exactly (sequencer + phases + `rulebookOrder.test.ts`); trade-route validity (contiguity, mountains, wrap, outpost/colony rows); TradeRouteOverlay legality; sell-goods pricing = `goodsPriceMarkers` on both surfaces; piracy gold flow; factory income + Engaged Factories; election math incl. tie→incumbent and VP formula; retrieve free/any-distance.

### 4. Battle system

- **B1 (RB)** FoW Shields 4–8 vs 1–5. = S1.
- **B2 (RB)** "No Effect" redrawn on battle draws — battle draws can never whiff (`eots42.md:636` vs `:665`; `helpers.ts:156-179`).
- **B3 (RB)** Improved Training applied to deck draws (hand-only per rulebook); never applied in conquest even for hand plays; `fowSource` tracked but never read (`eots42.md:665`; `resolveBattle.ts:322-359,613-614`).
- **B4 (RB)** Elite regiments absorb 3 hits; rulebook says 2 (`eots42.md:678`; `resolveBattle.ts:208-211,398-400,652-657`).
- **B5 (RB)** Odd/partial hits destroy whole units instead of being ignored (no-levies rule; conquest `ceil`) (`eots42.md:689`; `resolveBattle.ts:196-214,379-402,645-658`).
- **B6 (RB)** Ground victory/yield skips Claim Land: yield transfers ownership instantly (no VP/heresy/choice); a winner with no troops leaves the defeated defender owning the building; forts never transfer (`eots42.md:410,443,447,691`; `yieldToAttacker.ts:48`; `garrisonTroops.ts:36`).
- **B7 (RB)** Attacking an undefended building = free +1 VP battle vs 0 swords; rulebook says treat as yielded, no VP (`eots42.md:693`; `findNext.ts:91-96`).
- **B8 (RB)** Re-claim your own outpost each round for +1 VP + heresy + price shift (`eots42.md:449,453`; `findNext.ts:127-135`; `moveDefinitions.ts:159-171`).
- **B9 (RB)** Claim price markers move unconditionally (rulebook: only with an established route, first claim only); no route-chain placement at claim time (`eots42.md:451,453`; `constructOutpost.ts:20-26`).
- **B10 (RB)** Yield offered without the skyship-chain precondition, and by default to every defender (rulebook: attacker's choice) (`eots42.md:410,691`; `yieldToAttacker.ts`).
- **B11 (RB)** Attacker loses the serial-challenge right after an evasion (`eots42.md:366`; `resolutionSequencer.ts:37-53`).
- **B12 (RB, soft-lock)** Retreat/evade destinations: precomputed tiles require completely-empty and skip same-square/Faithdom; validator rejects non-adjacent/mountain options the UI then offers → INVALID_MOVE loop when no adjacent tile is empty (`eots42.md:370,669`; `resolveBattle.ts:534-557`; `mapUtils.ts:170-201`; `RelocateLoserDialog.tsx:27-43`).
- **B13 (RB, soft-lock)** Ground-battle defender's FoW dialog never opens (requires being in battleMap; a ground defender has no fleet there) — human defender cannot proceed (`DrawOrPickCardDialog.tsx:11-21`; `findNext.ts:93`; `helpers.ts:276-281`).
- **B14 (RB)** Map square (0,0) skipped by all four encounter scans (`findNext.ts:20-24,54-58,86-90,122-126`).
- **B15 (RB)** Conquest failure mangles stranded troops: levies uplifted into regiments, elites deleted, capacity ignores elites (`eots42.md:418,697`; `resolveBattle.ts:704-733`).
- **B16 (RB)** `relocateDefeatedFleet` corrupts battleMap when the loser has 2+ fleets at the tile (splice(-1) deletes another player) (`relocateDefeatedFleet.ts:49-58`).
- **B17 (RB)** `garrisonTroops` trusts client input — no cap or negative guard (`garrisonTroops.ts:17-36`).
- **B18 (RB)** Faerie Uprising: garrison-only defense, no rival-fleet assistance, winning defender takes zero losses, invented +1 VP, no follow-up attack opportunity (`eots42.md:70,439`; `resolveDeferredBattles.ts:22-90`). See also E33.
- **B19 (RB)** Infidel Fleet encounter combat resolved in invasionCheck (after trade/piracy) instead of the Encounter stage; fights only the target's single largest fleet (`eots42.md:372`; `phases/invasionCheck.ts:20`; `resolveInfidelFleet.ts:204-226`). = E23.
- **B20 (MISS)** Attack on the Infidel Hosts (eots42.md:412) — entirely absent.
- **B21 (MISS)** Tactical Alliances (optional, eots42.md:699-709) — absent (OK for optional; recorded).
- **B22 (MISS)** Conquest by garrison alone (`eots42.md:416`); claim while rival fleets co-exist (`:443`); destroy/downgrade buildings (`:455`); player-apportioned losses (`:669`); defender never shown the attacker's revealed card before choosing (`:665`).
- **B23 (MISL)** BattleResultDialog double-counts FoW (totals already include it, then shown again as bonus) (`resolveBattle.ts:505-508`).
- **B24 (MISL)** DefendOrYieldDialog promises fort control the engine never transfers; OutpostOrColonyDialog omits the mandatory +1 heresy; AttackOrPassDialog offers already-challenged targets (`eots42.md:447,691`).
- **B25 (MIN)** Encounter scan order row-major vs rulebook NE-column-south + retrace; TileDetailContent legend loot reads `.outpost` where engine grants `.colony` (harmless today — all 6 legends duplicate lines); `DiscardFoWCardDialog` hardcodes maxCards=4; garrison formula duplicated in UI.

Conforming: plunder; failed-conquest reclaim ban; attacker-reveals-first routing; defender-wins-ties; ±VP awards; orthodox-vs-heretic heresy shift; route skyships excluded from combat; fleet chips use shared `fleetCombatValues`.

### 5. Discoveries, taxes, scoring, heresy

- **SC1 (RB)** Trade Gains ranking counts goods only — route/plunder Gold never enters; a test pins the wrong behavior (`eots42.md:474,590,1268`; `resolveRound.ts:136-147`; `roundEffectsPhases.test.ts:100`).
- **SC2 (RB)** Chain flip forced; rulebook allows declining ("may instead choose not to flip") (`eots42.md:124`; `pass.ts:5-10`; `discoverTile.ts:91-93`). UI compounds: Pass button live during forced chain, `mustContinueDiscovery` unused in frontend (SC16).
- **SC3 (RB)** VP can drop below zero via heresy scoring (raw `+=`) (`eots42.md:614`; `resolveRound.ts:103`).
- **SC4 (RB)** Final-round gold bonus negative for indebted players — double-punishes debt, bypasses floor (`eots42.md:620`; `resolveRound.ts:95`).
- **SC5 (RB)** = A4/X1 (agitator heresy direction).
- **SC6 (RB)** "Mercy of the Republics" — undocumented house rule in taxes phase (`Game.ts:425`; `stateUtils.ts:182-215`). Decide: rulebook it or label it.
- **SC7 (MIN)** Race to Discovery tie-break awards a bonus vs best *non-tied* count (strict amendment reading: 0); all-tied → full count as VP (`eots42_amendments.md:148`; `Game.ts:379-398`). = E15.
- **SC8 (MISL)** Heresy VP "at game end" on OpponentRail:199, PromptBar:293, ActionHoverContext:85 — it scores every round; RulesPage says so, contradicting its siblings. (The pending heresy-chip ruling now has a correctness angle, not just dedup.)
- **SC9 (MISL)** Punish/Convert tooltips state heresy directions wrong for Heretics; "Orthodox lose VP from heresy" only true on half the track (`ActionHoverContext.tsx:84-91`).
- **SC10 (MISL)** Palace tooltip: "scores at end of game" (actually per-round differential + immediate VP + founding heresy choice) (`ActionHoverContext.tsx:99-104`).
- **SC11 (MISL)** Factory tooltip: "produces one good per round" — factories yield Gold via the pool, capped by Engaged Factories; that mandatory amendment is surfaced nowhere except a log line (`ActionHoverContext.tsx:78-79`).
- **SC12 (MISS)** Per-position tax income shown nowhere. = A22.
- **SC13 (MISL)** Taxes phase hint "Collect income from your territories" — wrong source (`gameData.ts:197`).
- **SC14 (MISS)** GameOverView shows no winner/ranking/tie-break though `ctx.gameover.ranking` exists — on a VP tie the table can't tell you who won (`GameOverView.tsx:44`; `PlayerTable.tsx:62`; `resolveRound.ts:294-303`).
- **SC15 (MISS)** RoundSummaryDialog filters for "Trade routes:"/"Trade:" only — heresy VP, palace bonus, debt penalty, engaged factories, dissenters, and next-round player order all invisible (`RoundSummaryDialog.tsx:59-61`).
- **SC16 (MIN)** Pass live during forced chain flip; discovery legality/consequences (all-players heresy on Legend) never surfaced pre-click (`PromptBar.tsx:63-64,142-151`; `WorldMapTile.tsx:386-396`).

Conforming: trade VP schedule + tie splitting incl. worked example; heresy VP sign model; palace differential; debt divisor; final ranking VP→gold→IPO; tile mix; all-players heresy advance on legend/new race; taxes modifiers; reset PO recomputation; every Heresy Track Movements Summary row traced to a call site.

### 6. Fleets and map interaction

- **F1 (RB)** Movement range 3 vs 4. = A9.
- **F2 (RB)** deployFleet elite-laden = unladen → free mountain crossing (server-side only; UI path uses correct moveFleet check). = A10.
- **F3 (RB)** deployFleet on an away fleet skips resource checks but still overwrites composition and debits reserves (`deployFleet.ts:39-64` vs `:149-157`).
- **F4 (RB)** Emptied fleet never returned to its Fleet box — permanently stranded; UI then locks it out of deploy AND retrieve (`eots42.md:294`; `transferBetweenFleets.ts:75-83`; `PlayerDock.tsx:55`; `RetrieveFleetsDialog.tsx:42-47`).
- **F5 (RB)** Transfer can strip all skyships while troops remain aboard (the `> 0` clause exempts exactly the illegal state) (`eots42.md:292`; `transferBetweenFleets.ts:45`).
- **F6 (RB)** Server accepts loading beyond 5 skyships (`passFleetInfoToPlayerInfo.ts:36-45`); berth renderers silently truncate.
- **F7 (RB)** Transfers not bound to fleet movement — cargo relay doubles range (`eots42.md:294`; no `dispatchedThisRound` check in transfer/garrison moves).
- **F8 (RB)** Fog of war render-only; full map + hands in every client's state. = theme 1. (DOM leak fix confirmed: `WorldMapTile.tsx:353-361,381-384,407-409`.)
- **F9 (RB)** Garrison drags misrouted to `fleets[0]` regardless of source fleet — wrong fleet mutated or silent rejection (`FleetTransferDialog.tsx:312-327`).
- **F10 (MISL)** Multi-fleet rearrangements decompose into wrong/rejected sequences (deltas never decremented; kingdom branch processes in fleet-id order against empty reserves) → partial application, no feedback (`FleetTransferDialog.tsx:252-309`).
- **F11 (MISL)** Elite regiments invisible on the whole map layer (fleet icon, tooltips, drag ghost, garrison badge, retrieve dialog) — elite-laden fleet reads unladen/weaker (`FleetIcon.tsx:13-47`; `WorldMapTile.tsx:214-295`; `RetrieveFleetsDialog.tsx:220-224`).
- **F12 (MISL)** Manage Fleets openable any phase/turn; out-of-phase confirms close as if they succeeded (`WorldMapTile.tsx:334,557-563`; moves registered only in actions phase).
- **F13 (MISS)** Deposit/pick-up skyships during movement doesn't exist; trail substitute leaves non-adjacent (broken) chains on multi-square dispatch; placed route ships can never be reclaimed by their owner (`eots42.md:294,311-315`; `moveFleet.ts:75-76`; `retrieveFleets.ts:40-61`).
- **F14 (MISS)** = R5 (no en-route embark/disembark at retrieve).
- **F15 (MISS)** Laden vs empty fleets visually identical — composition is tooltip-only (and incomplete per F11). The "laden-fleet visuals" flagged unverified after the redesign do not exist.
- **F16 (MIN)** Home square unreachable/impassable during Actions (not forbidden by rulebook; inflates path costs) (`helpers.ts:44`).
- **F17 (MIN)** retrieveFleets: malformed id throws in the reducer. = R6.
- **F18 (MIN)** "Fleet 0" in tile details; 1-based everywhere else (`TilePresence.tsx:118`).
- **F19 (MIN)** Fleet can "move" to its own square for 2 gold (BFS never dedupes visited; start tile reappears in ring 2) (`helpers.ts:33-56`).

Conforming: 5-skyship/1-troop-per-skyship in validators + UIs; 3 fleets; mountain edges+corners bidirectional; E-W wrap everywhere; discovered-only movement; min-distance costing engine=UI; retrieval free; trail placement skip rules; piracy cut returns ship; combat chips via shared helper.

### 7. Events, rebellions, infidel invasion

Grand Army / invasion:
- **E1 (RB)** Win condition inverted: rulebook = army survives; engine requires annihilating the host (`eots42.md:520`; `resolveInvasion.ts:175`).
- **E2 (RB)** Casualties never applied to contributors — contributing is risk-free (`contributeToGrandArmy.ts`; `resolveInvasion.ts:170`).
- **E3 (RB)** Invasion aerial phase missing; skyships lumped in at 1S/1Sh; UI never passes the skyships argument, so fleet-only players can't avoid Shame (`eots42.md:518-520,376`; `resolveInvasion.ts:128-163`; `InvasionContributeDialog.tsx:33-37`).
- **E4 (RB)** NPR Grand Army always draws 6 contingents regardless of player count (`eots42.md:518`; `resolveInvasion.ts:136`).
- **E5 (MIN)** Tied-second forces get ±4 not ±2 (ambiguous wording); "largest force" ranked by swords not numbers; buy-off overpayment deducted in full (`resolveInvasion.ts:286-345`).
- **E6 (MISS)** Captain-General can't play FoW in the Grand Army battle — engine auto-draws (`eots42.md:520`; `resolveInvasion.ts:166-167`).

Rebellions:
- **E7 (RB)** Orthodox REBELLION targets the heretic with the *rightmost* (max) marker; rulebook says leftmost (`eots42.md:985`; `eventCardDefinitions.ts:983-997`).
- **E8 (RB)** Colonial REBELLION implemented as a kingdom rebellion: wrong phase, kingdom troops fight/die instead of the colony garrison, rival help is kingdom troops not fleets, chooser restricted to own colonies, no skyship marker (`eots42.md:76-79,959`; `resolveRebellion.ts:230-234`; `commitRebellionTroops.ts`; `contributeToRebellion.ts`).
- **E9 (RB)** `rebelCounter` write-only — occupation VP-suppression and "Host stays" effects never happen; no re-taking mechanic; a Fleet counter seized this way can never spawn (`eots42.md:959,977`; `resolveRebellion.ts:176`; `resolveDeferredBattles.ts:181,206`).
- **E10 (RB)** Loss distribution wrong: losses hit the defender's whole kingdom pool levies-first (uncommitted troops die; uncapped in the no-rival path); losing-side ally troops annihilated instead of surviving-and-returning (`eots42.md:81`; `resolveRebellion.ts:76-91,297,429-443`).
- **E11 (RB)** Fort shields granted per levy; rulebook: per regiment (`eots42.md:80`; `resolveRebellion.ts:49,379`; `resolveDeferredBattles.ts:42,188`).
- **E12 (MISS)** Defender can't refuse rival help; fleets can't be committed to rebellion defense (`eots42.md:78-79`).

Events:
- **E13 (RB)** Dynastic Marriage unenforced (attack allowed, just dissolves), never ends by its own rules (no Pretender/annulment path); UI promises "cannot attack" (`eots42.md:965`; `attackOtherPlayersFleet.ts:42-50`; `resolveRebellion.ts:95-118`; `EventChoiceDialog.tsx:149`).
- **E14 (RB)** Counter pools never reshuffled on return — draws deterministic (`eots42.md:77,516`; `Game.ts:203,206`; push/pop sites).
- **E15 (RB)** Emergency election counts influence votes and breaks ties for the incumbent; rulebook: own-kingdom votes only, ties IPO (`eots42.md:953`; `immediateElectionVote.ts`).
- **E16 (RB)** Lenders Refuse Credit never clears — re-arms on any later debt forever (`eots42.md:979`; `eventCardDefinitions.ts:830-842`; `moveValidation.ts:19-25`).
- **E17 (RB)** Peasant REBELLION rebel win skips taxes for ALL players, not just the target (`eots42.md:991`; `Game.ts:410-414`).
- **E18 (RB)** Foreign Agitators resolves as an instant, alignment-blind heresy bump — wrong mechanism, timing, and direction (`eots42_amendments.md:150`; `eventCardDefinitions.ts:657-670`). = X1 family.
- **E19 (RB)** Corruption Scandal: single-cathedral player not forced to the VP penalty (`eots42_amendments.md:144`; `eventCardDefinitions.ts:1238-1254`).
- **E20 (RB)** Guild Revolt: full charge into debt; no pay-what-you-can path (`eots42_amendments.md:142`; `resolveEventChoice.ts`).
- **E21 (RB)** Epoch deck assignment deviates from the amendment tables for 4–5 cards (Late-listed cards classified Early etc.) — undocumented (`eots42_amendments.md:104-128`; `manufacturedFunSeed.ts:243-271`). = X5.
- **E22 (RB)** Infidels Invade Faerie ignores the next-to-Infidel-Empire adjacency requirement for target and void check (`eots42.md:977`; `eventCardDefinitions.ts:505-507,1087-1103`).
- **E23 (RB)** = B19 (Infidel Fleet stage + single-fleet targeting). Evading fleets also never relocate (`eots42.md:372`; `respondToInfidelFleet.ts`).
- **E24 (RB)** Some no-effect cards fizzle instead of "reveal another" (guild revolt/corruption with no valid targets; null battle-event targets) (`eots42.md:64`; `eventCardDefinitions.ts:1036-1102`).
- **E25 (RB)** Face-down chosen cards publicly attributed — dock popover shows each player's color dot next to their card during and after picking (`eots42.md:60-62`; `PlayerDock.tsx:428-449`; `eventState.eventContributions` public).
- **E26 (MISL)** Card effect texts describe different effects than engine/rulebook: Peasant REBELLION ("most gold"), Peace Accord ("no battles this round"), Lenders ("may not borrow"), Infidels Invade Faerie (describes the Grand Army), Corruption Scandal ("pay gold"), Archprelate Dies (text right, engine wrong) (`eventCardDefinitions.ts:101,107,137,143,197`; rendered by `PickEventCardDialog.tsx:118` and the dock).
- **E27 (MISS)** Player choices auto-resolved: Corsairs building loss (engine picks), Invade-Faerie target (first found), Allies-in-Faerie placement/quantity (auto-maxed to kingdom pool) (`eots42.md:951,975,977`; `eventCardDefinitions.ts:698-709,850-874,1090-1101`).
- **E28 (MIN)** Headstrong Commander: criterion ignores fleets, failure deletes the outpost itself; Royal Succession 1-card-left double-score; Faerie FoW committed before the host is revealed; raw tile names in dialogs; stale "not implemented" comment (`eventCardDefinitions.ts:876,1062-1085,1156-1186`; `resolveDeferredBattles.ts:132-138,261`; `EventChoiceDialog.tsx:182`).

Conforming: events procedure (choose→shuffle→reveal→void→replenish); all base VOID conditions; host/contingent pools; buy-off formula + shortfall cycling; Captain-General nomination; Shame directions; Peace Accord exemptions; crops/plague/legend-loss cards; Schism/Colonial Prelates; epoch merge timing; Race-to-Discovery per-tile counting.

### 8. Sequence of play, anytime options, deals, variants, RulesPage

- **X1 (RB)** Agitator heresy always advances (see A4/SC5/E18 — three independent confirmations, two code paths: `resolveRound.ts:180-188` and `eventCardDefinitions.ts:657-670`).
- **X2 (RB)** "Anytime" options legal only during your own actions-phase turn (registered in one phase's move list, no activePlayers stage); UI offers them in every phase from the rail — server rejects, dialog closes as if fine (`eots42.md:772-780`; `Game.ts:281,465`; `Trade.tsx:150`; `GameLayout.tsx:39`).
- **X3 (MISS)** Deals: full engine support (`proposeDeal`/`acceptDeal`/`rejectDeal`, `G.pendingDeal`) with ZERO UI — unreachable; `transferOutpost` likewise UI-less; and even engine-side the target could only accept on their own turn (`eots42.md:783-790`).
- **X4 (MISS)** Deal currencies missing vs rulebook list: Council of Prelates votes (promises arguably out of scope); prohibited list correctly not exposed (`eots42.md:787`; `types.ts:17-22`).
- **X5 (RB)** = E21 (epoch deck deviations).
- **X6 (RB)** = R3 (cut-the-route granularity; RulesPage teaches the rule the engine doesn't have).
- **X7 (MISL)** TopStrip round counter one behind during Events (round increments in discovery onBegin — "Round 0/6" through the first Events phase) (`Game.ts:338`; `TopStrip.tsx:219`).
- **X8 (MISL)** RulesPage: omits Inquisition (both decree lists say four), Archprelate Fatigue, all anytime options and deals; documents "Mercy of the Republics" (no ruleset); FoW "1-5 shields" contradicts the engine's 4–8; heresy "each round" contradicts PromptBar's "game end" (`RulesPage.tsx:322,468,519-537,597,609-614`).
- **X9 (MIN)** sendAgitators no server-side gold validation. = A15.
- **X10 (MIN)** "Home Waters" label vs glossary "Faithdom" (`locationLabels.ts:21-23`); dead variable-length branch in `discoverTile.ts:79-89` (MIN_ROUNDS=MAX_ROUNDS=6).
- **X11 (MISS-optional)** No rulebook variants offered at match creation (numPlayers only) — acceptable, recorded.

Conforming: 7-phase chip row incl. scoring matches rulebook order; `phaseGroup`/`RESOLUTION_SEQUENCE` truthfully collapses the 12 sub-phases; 6-round structure; anytime option 3 constraints; skyship bank price; prison capacity; glossary spot-checks otherwise fine.

---

## Live-game test checklist (statically unverifiable)

1. 3+ players: rebellion + invasion in the same round — no stalled turn; invasion draw fires after fleet combat.
2. Human ground-battle defender: confirm B13 (FoW dialog never opens) and B12 (retreat soft-lock when no adjacent tile is empty).
3. 3-fleet tile rearrangement in Manage Fleets — confirm F9/F10 partial application.
4. Out-of-phase "Anytime Action" click — what feedback (if any) the player gets.
5. Chosen Cards popover visibility mid-pick in a real multi-client session (E25).
6. Touch devices: fleet composition is tooltip-only (F11/F15).
7. Second events phase: PickEventCardDialog reopen behavior (local `open` state).
