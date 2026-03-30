# Bot Personality System — Complete Reference V1 Deprecated


## Overview

Every bot has 8 personality weights that sum to 1.0. These weights are derived from the bot's dealt cards (KA card + legacy card + alignment). The weights determine how the bot values different actions during gameplay.

```
Cards dealt → deriveWeightsFromCards() → 8 personality weights → move scoring → action selection
```

---

## The 8 Dimensions

Each dimension represents a strategic priority. Higher weight = the bot cares more about that aspect of the game.

### territory (default: 0.13)
**What it represents:** Controlling land — outposts, colonies, trade routes.
**Gameplay effect:** Bots with high territory deploy fleets, build outposts, colonise land, and discover tiles more aggressively.
**VP connection:** Outposts/colonies score VP. Trade routes enable factory income.

### economy (default: 0.13)
**What it represents:** Gold generation and trade infrastructure.
**Gameplay effect:** Bots with high economy build factories, shipyards, and prioritise trade routes. They value plundering and selling goods.
**VP connection:** Factories generate gold per round. Gold converts to VP at end of game (5g = 1VP).

### military (default: 0.13)
**What it represents:** Combat strength — skyships, regiments, fleets.
**Gameplay effect:** Bots with high military recruit regiments, purchase/build skyships, deploy laden fleets, and attack rivals.
**VP connection:** Military enables conquest (take rivals' territories) and defence (protect VP-generating buildings).

### religion (default: 0.13)
**What it represents:** Religious influence — heresy track, buildings, elections.
**Gameplay effect:** Bots with high religion build cathedrals/palaces (alignment-appropriate), influence prelates, issue holy decrees, and contest Archprelate elections.
**VP connection:** Archprelate election awards VP each round. Cathedrals/palaces give VP. Heresy track penalties can lose VP.

### legacy (default: 0.13)
**What it represents:** Optimising for the legacy card's VP condition.
**Gameplay effect:** Bots with high legacy make decisions that maximise their specific legacy card's scoring condition (e.g. "the conqueror" wants territory, "the merchant" wants gold).
**VP connection:** Legacy cards score bonus VP at game end based on their condition.

### positioning (default: 0.11)
**What it represents:** Operational readiness — deployed fleets, counsellors available, FoW cards in hand.
**Gameplay effect:** Bots with high positioning recruit counsellors, draw Fortune of War cards, and keep fleets deployed for flexibility.
**VP connection:** Indirect — enables future actions rather than scoring directly.

### threats (default: 0.11)
**What it represents:** Defensive awareness — unprotected territories, free dissenters, piracy exposure.
**Gameplay effect:** Bots with high threats build forts, garrison troops, and prioritise punishing dissenters.
**VP connection:** Prevents VP loss from conquest, heresy penalties, and piracy.

### republicAccess (default: 0.13)
**What it represents:** Access to republic Mercy (VP catch-up mechanism for trailing players).
**Gameplay effect:** Bots with high republicAccess influence Venoa/Zeeland prelate slots and care about religious alignment with republics.
**VP connection:** Mercy awards VP to trailing players who have republic access. Critical when behind.

---

## How Personality Weights Are Derived

The pipeline in `personalities.ts → deriveWeightsFromCards()`:

```
Step 1: Start with baseline
        { territory:0.13, economy:0.13, military:0.13, religion:0.13,
          legacy:0.13, positioning:0.11, threats:0.11, republicAccess:0.13 }

Step 2: Apply KA card shift (from kaShifts config)

Step 3: Apply legacy card alignment shift (colour × kingdom alignment)

Step 4: Apply legacy card name shift (from legacyNameShifts config)

Step 5: Add random jitter (±5% per dimension, jitterRange: 0.1)

Step 6: Clamp all weights to minimum 0.01

Step 7: Normalize to sum = 1.0
```

### Step 2: KA Card Shifts

The Kingdom Advantage card shifts weights toward the card's strategic theme:

```
KA Card                    Shifts
─────────────────────      ──────────────────────────────────
elite_regiments            military += 0.12
improved_training          military += 0.08
licenced_smugglers         economy += 0.12
more_efficient_taxation    economy += 0.08, republicAccess -= 0.05
more_prisons               religion += 0.10
patriarch_of_the_church    religion += 0.12, republicAccess += 0.03
sanctioned_piracy          military += 0.05, economy += 0.08, republicAccess -= 0.03
```

### Step 3: Legacy Card Alignment Shifts

The legacy card has a colour (purple or orange). When colour misaligns with your kingdom's religion, the legacy card VP is halved at game end. The bot compensates by leaning into republicAccess (Mercy catch-up):

```
Condition                              Shift
──────────────────────────────────     ──────────────────────
purple card + heretic kingdom          republicAccess += 0.08
orange card + orthodox kingdom         republicAccess += 0.10
card name = "the magnificent"          republicAccess += 0.08
card name = "the pious"               republicAccess -= 0.05
```

"The pious" reduces republicAccess because it's religiously dominant (doesn't need Mercy).

### Step 4: Legacy Card Name Shifts

The legacy card name provides the largest identity shift:

```
Legacy Name        Shifts
────────────       ─────────────────────────────────────
the conqueror      territory += 0.15, military += 0.08
the navigator      territory += 0.12, positioning += 0.05
the merchant       economy += 0.15, territory += 0.05
the mighty         military += 0.15, threats += 0.05
the pious          religion += 0.15
the magnificent    religion += 0.12
the builder        territory += 0.08, religion += 0.05
the aviator        military += 0.08, positioning += 0.08
the great          (no shift — balanced wild card)
```

### Example: Full Derivation

Bot picks **elite_regiments** (KA) + **"the mighty"** (purple legacy) as an **orthodox** kingdom:

```
Step 1: baseline         ter=0.13  eco=0.13  mil=0.13  rel=0.13  leg=0.13  pos=0.11  thr=0.11  rep=0.13
Step 2: elite_regiments  ter=0.13  eco=0.13  mil=0.25  rel=0.13  leg=0.13  pos=0.11  thr=0.11  rep=0.13
Step 3: purple+orthodox  (no shift — purpleWhenHeretic doesn't match)
Step 4: the mighty       ter=0.13  eco=0.13  mil=0.40  rel=0.13  leg=0.13  pos=0.11  thr=0.16  rep=0.13
Step 5: jitter           (small random ±5%)
Step 6: clamp min 0.01
Step 7: normalize → sum=1.0

Result ≈ { territory:0.09, economy:0.09, military:0.28, religion:0.09,
           legacy:0.09, positioning:0.08, threats:0.11, republicAccess:0.09 }

Dominant weight: military → Bot named "Conqueror"
```

---

## Move Values — How Dimensions Map to Actions

The `moveValues` config in `weightsConfig.local.json` defines how each move is scored:

```
score = base + Σ(bot_dimension_weight × move_dimension_multiplier)
```

### Anatomy of a move value entry

```json
"deployFleet": { "base": 0.12, "territory": 0.3, "military": 0.2, "positioning": 0.15 }
                  ▲              ▲                  ▲                 ▲
                  │              │                  │                 │
            Everyone gets    Territory-focused   Military-focused   Positioning-focused
            this floor       bots get more       bots get more      bots get more
```

- **base**: Personality-independent. Every bot gets this score regardless of weights. High base = every bot considers this move. Low/no base = only bots with matching personality weights consider it.
- **dimension multipliers**: Personality-dependent. Multiplied by the bot's weight for that dimension. High multiplier = this move is strongly aligned with that strategic dimension.

### Current Move Values (weightsConfig.local.json)

#### Counsellor Actions (cost 1 counsellor + gold)
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
recruitCounsellors   { base:0.3, positioning:0.2 }             Get more counsellors
recruitRegiments     { base:0.1, military:0.25 }               Get regiments
purchaseSkyships     { military:0.3, positioning:0.2 }         Buy skyships
trainTroops          { base:0.1, military:0.2 }                Upgrade levies→regiments
drawFoWCards         { military:0.15, positioning:0.1 }        Draw battle cards
conscriptLevies      { military:0.15 }                         Get levies (costs VP)
```

#### Building Actions (cost 1 counsellor + gold)
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
cathedralOrthodox    { religion:0.4, legacy:0.2 }              Orthodox bot builds cathedral
cathedralHeretic     { religion:0.1 }                          Heretic bot builds cathedral (low — wrong building)
palaceHeretic        { religion:0.4, legacy:0.2 }              Heretic bot builds palace
palaceOrthodox       { religion:0.1 }                          Orthodox bot builds palace (low — wrong building)
shipyard             { economy:0.2, positioning:0.15 }         Enables buildSkyships
fort                 { threats:0.3, territory:0.1 }            Defend territory
foundFactoryEngaged  { base:0.1, economy:0.4 }                Factory with trade route (good)
foundFactoryUnengaged { base:0.02 }                            Factory without trade route (wasteful)
```

#### Fleet Actions (cost 1 counsellor + 1 gold)
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
deployFleet          { territory:0.3, military:0.2, pos:0.15 } Launch fleet from home
moveFleet            { positioning:0.2, territory:0.15 }       Reposition existing fleet
garrisonTransfer     { threats:0.2, territory:0.1 }            Move troops between fleet/garrison
```

#### Player Board Actions (cost 1 counsellor, once per round each)
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
buildSkyships        { military:0.25, positioning:0.15 }       Build skyships (requires shipyard)
```

#### Religious/Political Actions
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
influencePrelates    { religion:0.25 } or { rel:0.2, rep:0.3 } Influence prelate/republic
convertMonarch       { legacy:0.4, religion:0.2 }              Switch alignment
issueHolyDecree      (no explicit entry — uses default)         Archprelate-only decree
alterPlayerOrder     { positioning:0.15 }                       Change turn order
```

#### Anytime Actions (no counsellor cost)
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
sendAgitatorsBase    { military:0.15 }                          Place dissenter on rival
sendAgitatorsLeader  0.15 (flat bonus if target is VP leader)   Extra incentive vs leader
sell                 { base:0.05 }                              Sell skyships/buildings
```

#### Battle/Conquest Actions
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
attack               { military:0.35, territory:0.15 }          Initiate aerial/ground battle
evade                { threats:0.2 }                             Avoid battle
plunder              { economy:0.3, territory:0.1 }             Loot after battle
coloniseLand         { territory:0.5, legacy:0.2 }              Colonise a territory
constructOutpost     { territory:0.4, economy:0.15 }            Build outpost
```

#### Other
```
Move                 Config                                     Purpose
────────────────     ──────────────────────────────────         ───────────────────
discoverTile         { base:0.1, territory:0.2 }               Explore the map
voteSelf             { religion:0.3 }                           Vote self in election
voteOther            { base:0.1 }                               Vote for someone else
retrieveFleets       { base:0.15 }                              Bring fleets home
pass                 { base:0.0 }                               Do nothing
```

---

## Context Bonuses (ActionsStrategy.ts)

On top of move values, the ActionsStrategy adds situational bonuses:

```
Condition                          Bonus                    Affected Moves
───────────────────────────        ──────                   ──────────────────
Gold < 3                           -0.15                    Expensive moves (buildings, deploy, agitators)
No skyships after R1               +0.1                     purchaseSkyships, buildSkyships
Final round                        +0.15                    foundBuildings (direct VP)
Am VP leader                       +0.1 × w.threats         forts, garrisons
Am VP leader                       +0.1                     influencePrelates (block rivals' Mercy)
Trailing by 6+ VP                  +0.3 × vpGap/15          influencePrelates republics (Mercy access)
Trailing by 6+ VP                  +0.05                    deployFleet, moveFleet
Trailing by 6+ VP                  +0.1 × w.military        attack moves
Factory >= active routes           -0.3                     foundFactory (would be unengaged)
Has free dissenters                +0.15 × count            punishDissenters
sendAgitators vs VP leader         +0.1                     sendAgitators targeting leader
```

---

## Eval Dimensions (State Evaluation)

The `evaluateState()` function in `evaluate.ts` scores the overall game position using 8 normalised dimensions (0-1 each), weighted by personality:

```
stateScore = Σ(weight_i × normalizedDimension_i)
```

### Eval sub-configs (from weightsConfig.local.json → eval section)

```
territory:
  colonyWeight: 1.5        (colonies count 1.5x outposts)
  fortWeight: 0.5           (forts count 0.5x outposts)
  routeWeight: 0.3          (trade routes add 0.3 per route)

economy:
  factoryIncomeValue: 3     (each engaged factory worth 3 gold equivalent)
  unengagedPenalty: 2        (unengaged factory penalised by 2)

military:
  levyWeight: 0.5           (levies worth half a regiment)
  eliteWeight: 1.5          (elite regiments worth 1.5x)
  skyshipWeight: 1.5         (skyships worth 1.5x)

religion:
  archprelateBonus: 0.3     (being Archprelate adds 0.3 to religion score)
  fatigueFactor: 0.3         (consecutive Archprelate wins reduce bonus)
  buildingBonus: 0.08        (per aligned building)
  dissenterPenalty: 0.05     (per free dissenter)

legacy:
  maxReasonableVP: 20       (normalisation cap)
  earlyGameWeight: 0.3      (legacy matters less early)
  lateGameWeight: 0.7        (legacy matters more late)

positioning:
  fleetWeight: 0.3           (deployed fleets)
  counsellorWeight: 0.4      (available counsellors)
  fowWeight: 0.3             (FoW cards in hand)
  fowMax: 4                  (normalise against max 4 cards)

threats:
  dissenterThreat: 0.1       (each dissenter adds 0.1 threat)
  piracyExposureWeight: 0.3  (enemy fleets on your tiles)

republicAccess:
  mercyVPGapScale: 20       (how many VP behind before Mercy is critical)
```

---

## Personality Names

The dominant weight determines the bot's name:

```
Dominant Weight    Bot Name
───────────────    ────────────
military           Conqueror
economy            Merchant
religion           Prelate
territory          Empire Builder
legacy             Legacy Hunter
positioning        Admiral
threats            Warden
republicAccess     Diplomat
```
