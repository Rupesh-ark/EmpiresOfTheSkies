# Trade Route Visualization

## Status: Not started

## What
Draw visible trade route lines on the map showing each player's skyship chains from their outposts/colonies back to Faithdom.

## Current state
- Trade routes are computed during resolution via `tradeRouteResolver.ts` → `grantTradeRouteGoods()`
- `buildPlayerNetwork()` in `mapUtils.ts` builds a set of tiles where a player has fleets with skyships
- `bfsReachable()` checks if an outpost/colony can trace a path back to Faithdom through this network
- Trade routes work correctly for gameplay — goods are granted. But there's NO visual representation on the map.

## Rules summary
- A trade route is a contiguous chain of a player's skyships from an outpost/colony back to Faithdom
- Chain is traced through tile edges and/or diagonally through corners
- Cannot cross mountain ranges (blocked edges)
- No skyship is placed on the Faithdom tile itself — just adjacent to it
- Individual skyships on a tile mark the route (separate from fleets)
- Multiple players' skyships can coexist on the same tile
- Skyships forming trade routes cannot attack or be attacked

## Current data model gap
The game currently uses **fleet positions** as the skyship network (`buildPlayerNetwork` checks `fleet.skyships > 0`). There's no separate data structure for individual trade route skyships placed on tiles. This may need to be added:

```ts
// Possible addition to PlayerInfo
tradeRouteSkyships: [number, number][];  // array of [x,y] positions
```

Or a map-level structure:
```ts
// On MapState
tradeRouteMap: Record<string, string[]>;  // tileKey → array of playerIDs with skyships there
```

## Visualization design

### On the map
- Draw coloured lines (matching player colour) connecting tiles in the trade route chain
- Line goes from outpost/colony tile → through intermediate tiles → to Faithdom-adjacent tile
- Use SVG overlay on top of the map grid (same approach as Phase C path lines)
- Dashed line for incomplete/broken routes, solid for active routes
- Small skyship disc icon on each intermediate tile in the chain

### In tile detail popup
- Show "Trade Route Skyship" in the TilePresence section when a player has a route skyship on that tile
- Show which player owns it (colour dot + kingdom name)

### Piracy interaction
- When an enemy fleet or the Infidel Fleet is on a tile in the route, highlight that segment in red/orange
- Show "Subject to Piracy" warning in tile detail

## Key files
- `packages/game/src/helpers/mapUtils.ts` — `buildPlayerNetwork`, `bfsReachable`, `FAITHDOM_TILES`
- `packages/game/src/helpers/tradeRouteResolver.ts` — `grantTradeRouteGoods`
- `packages/game/src/moves/conquests/constructOutpost.ts` — where skyship chains are placed after claiming
- `empires_of_the_skies/src/components/WorldMap/WorldMap.tsx` — SVG overlay goes here
- `empires_of_the_skies/src/components/WorldMap/WorldMapTile.tsx` — TilePresence section

## Dependencies
- Need to resolve the data model for individual trade route skyships first
- SVG overlay approach same as Phase C pathfinding visualization
