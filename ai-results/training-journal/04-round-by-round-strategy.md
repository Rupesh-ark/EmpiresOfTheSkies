# Round-by-Round Strategy Guide — What Good Play Looks Like

## How to Use This

This document describes what a competent human player should be doing each round. Use it to:
1. **Check your bots** — if a bot isn't doing what's listed for its archetype in a given round, the weights or enumerate function need adjustment
2. **Inform your playtesting** — when you play the game yourself, follow these priorities to generate baseline performance data
3. **Set weight expectations** — the bot's move distribution should roughly match these priorities

---

## Universal Priorities (Every Player, Every Archetype)

### Round 1: Foundation

**Must do:**
- Discover at least 1 tile (you need to know what's out there)
- Purchase 2-4 skyships (from Republics — 2 gold each + stacking)
- Claim at least 1 land as an outpost if a fleet can reach it (1 VP + Trade Gains)

**Should do:**
- Recruit 1 counsellor (going from 4 to 5 gives you one more action per round for the rest of the game — this is the highest compound-value action in round 1)
- Start placing skyships toward a trade route chain

**Avoid:**
- Building factories (nothing to engage them with yet)
- Building cathedrals or palaces (5 gold is too much of your 6 starting gold)
- Sending agitators (2 gold is better spent on skyships)
- Recruiting regiments (nothing to conquer yet)

**Gold budget (~6 starting + 4-8 tax = 10-14 gold):**
- 4-8 gold on skyships (2-4 skyships)
- 1 gold on counsellor recruitment
- 1-4 gold on fleet dispatch (movement costs)
- 0 gold saved (spend everything on infrastructure)

### Round 2: First Engine Online

**Must do:**
- Complete at least 1 trade route (skyship chain from outpost to Faithdom)
- Discover 1 more tile (expand options for round 3)
- Collect your first Trade Gains income

**Should do:**
- Found 1 factory (now that you have a route, it's engaged)
- Recruit another counsellor if still at 5 (going to 6)
- Start recruiting regiments if playing military

**Avoid:**
- Spreading too thin (claiming 3 outposts without completing any routes is worse than 1 outpost with a complete route)
- Ignoring heresy management (you've claimed land and discovered tiles — heresy is advancing)

### Round 3: Engine Running + Conflict Begins

**Must do:**
- Have at least 1 active trade route generating income
- Have at least 1 factory engaged
- Late event deck merges in — be prepared for colony-dependent events

**Should do:**
- Expand to 2nd outpost/colony
- Address heresy track (Punish Dissenters or build Cathedral/Palace)
- Contest Archprelate election if you have votes
- Protect routes if piracy is appearing

**Key shift:** This is where archetypes diverge sharply.

### Round 4: Peak Operation

**Must do:**
- Your primary engine should be fully operational
- Trade Gains scoring is now 9/6/3 VP (rounds 4-5) — trade position matters enormously
- Address any threats (piracy, rebellions, Infidel Fleet)

**Should do:**
- Build toward legacy card objective
- Grand Army preparation (Infidel invasion increasingly likely)
- Archprelate contest intensifies (VP reward is significant)

**Avoid:**
- Starting new infrastructure (factory in round 4 only pays off 2-3 rounds — marginal)
- Risky conquests without FoW hand backup

### Rounds 5-6 (Extended Game): VP Acceleration

**Must do:**
- Maximise Trade Gains ranking (12/8/4 VP at stake — biggest single scoring)
- Ensure legacy card alignment is correct (mismatch halves legacy VP)
- Protect everything you've built

**Avoid:**
- New expansion (no time for compound returns)
- Risky attacks (losing resources with 1-2 rounds left is unrecoverable)
- Changing strategy (commit to what you've built)

---

## Archetype-Specific Priorities

### Bucket A: Trade-Focused (Merchant/Navigator + Smugglers/Taxation)
R1: Buy 4 skyships, Claim 1 outpost, Recruit 1 counsellor
R2: Complete first trade route, Found 1 factory, Claim 2nd outpost
R3: Complete 2nd route, Found 2nd factory, Start 3rd route chain
R4: 3-4 routes + 3-4 factories, Protect routes, Contest Archprelate
R5-6: Maximise Trade Gains ranking, Sell goods at peak, Legacy scoring

### Bucket B: Colonial-Military (Conqueror/Mighty + Elite Regiments/Training)
R1: Buy 2 skyships + recruit 4 regiments, Recruit 1 counsellor, Discover tiles
R2: Buy 2 more skyships + draw 2 FoW cards, Deploy fleet with regiments, Claim outpost
R3: First conquest attempt, Build fort on colony, Establish route from colony
R4: Second conquest or garrison, Found factory, Contest Archprelate
R5-6: Protect colonies, Maximise Trade Gains, Legacy scoring

### Bucket C: Religious-Orthodox (Pious/Builder + Patriarch/Prisons)
R1: Recruit 1 counsellor, Buy 2 skyships, Discover 1 tile
R2: Found 1st cathedral (5 gold), Claim 1 outpost + start route, Punish heretics
R3: Found 2nd cathedral, Complete route + factory, Contest Archprelate
R4: Found 3rd cathedral, Punish heretics aggressively, Archprelate decrees
R5-6: Found 4th+ cathedral, Maintain low heresy, Legacy scoring

### Bucket D: Heretic-Palace (Magnificent + flexible KA)
R1: Recruit 1 counsellor, Buy 2 skyships, Discover 1 tile
R2: Convert to Heretic + found 1st palace, Claim outpost, Influence Republic
R3: Found 2nd palace, Complete route + factory, Punish believers
R4: Found 3rd palace, Maintain Republic Influence for Mercy, Accept Curse risk
R5-6: Found 4th+ palace, Maximise heresy track VP, Legacy scoring

### Bucket E: Piracy-Aggression (Aviator/Mighty + Sanctioned Piracy)
R1: Buy 4 skyships, Recruit 1 counsellor, Discover tiles (scout routes)
R2: Deploy 1 fleet, Watch where others build routes, Claim 1 outpost
R3: Position fleet on trade junction, Collect piracy gold + VP, Own trade route
R4: 2nd piracy position, Collect vs Cut decisions, Contest Archprelate
R5-6: Maximise piracy VP, Protect own routes, Legacy scoring

### Bucket F: Balanced-Generalist (The Great/Builder + Taxation/flexible)
R1: Buy 2 skyships + recruit 4 regiments, Recruit 1 counsellor, Discover
R2: Claim outpost + start route, Found 1 cathedral/palace, More counsellors
R3: Complete route + factory, 2nd building, Begin 2nd outpost
R4: Assess winnable categories, Double down on 3-4 leads, Contest Archprelate
R5-6: Secure category leads, Maintain breadth, Legacy scoring

---

## Quick Check: Is My Bot Playing Well?

1. Did the bot buy skyships in rounds 1-2? If no -> purchaseSkyships undervalued or not enumerated
2. Does the bot have at least 1 complete trade route by round 3? If no -> fleet/route logic broken
3. Is factory count <= trade route count? If factory > routes -> building unengaged factories
4. Is the bot pursuing its legacy objective? Conqueror has colonies? Pious has cathedrals?
5. Is sendAgitators < 15% of total moves? If higher -> agitator eval too generous
6. Is winner VP > 25 in a 4-round game? If not -> bots not engaging VP systems

## VP Benchmarks (competitive human play, 6 players)

| Round | Leading | Competitive | Falling Behind |
|---|---|---|---|
| After R1 | 14-16 | 11-13 | 10 (starting) |
| After R2 | 20-25 | 16-19 | 12-15 |
| After R3 | 30-38 | 24-29 | 18-23 |
| After R4 | 40-50 | 32-39 | 24-31 |
| After R5 | 52-65 | 42-51 | 32-41 |
| After R6 | 65-85 | 50-64 | 35-49 |
