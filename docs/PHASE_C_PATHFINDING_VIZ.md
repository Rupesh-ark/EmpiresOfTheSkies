# Phase C: Live Pathfinding Visualization

## Status: Not started

## What
Visual feedback while dragging a fleet on the map, showing the path and terrain restrictions.

## Current state (Phase B — done)
- Fleet icons on map tiles, draggable during actions phase
- Valid destination tiles glow gold with cost badges (1g, 2g, 3g)
- Invalid/unreachable tiles get a dark overlay
- Drop on valid tile → deploy confirmation dialog
- `moveFleet` move handles fleet movement without double-deducting reserves

## What Phase C adds

### 1. Path line while dragging
Draw a line from the source tile to the cursor/hovered tile as the player drags a fleet.

- Line follows the BFS path (shortest route), not a straight line
- Colour: gold/amber, semi-transparent
- Rendered as an SVG overlay on top of the map grid
- Updates in real-time as the cursor moves between tiles
- Could use `onDragOver` from dnd-kit to track which tile is being hovered

### 2. Mountain edge visualization
Show which tile edges are blocked by mountains so laden fleets can see why certain routes are unavailable.

- Each tile has a `blocked` array (e.g. `["N", "NE"]`) indicating mountain edges
- When dragging a **laden** fleet (has troops), highlight blocked edges with a visual indicator:
  - Small triangle/peak icons on the blocked edges
  - Or a red/orange line segment on the blocked edge
- When dragging an **unladen** fleet, mountains are passable — no indicators needed
- Data source: `G.mapState.currentTileArray[y][x].blocked`

### 3. Improvements to existing overlays
- Animate the gold glow on valid tiles (subtle pulse)
- Show the total gold cost near the cursor as you drag

## Implementation notes

### Path line approach
- Use an absolutely-positioned SVG element overlaying the entire map grid
- Calculate tile center positions from grid layout (each tile is 1/8 width, 1/4 height)
- BFS from source → hovered tile gives the path coordinates
- Draw polyline through tile centers

### Mountain edge positions
Each direction maps to a tile edge:
```
    NW  N  NE
     ┌─────┐
  W  │     │  E
     └─────┘
    SW  S  SE
```

For a blocked edge like "NE", draw an indicator on the top-right corner/edge of the tile.

### Key files
- `empires_of_the_skies/src/components/WorldMap/WorldMap.tsx` — DndContext, drag state
- `empires_of_the_skies/src/components/WorldMap/WorldMapTile.tsx` — tile rendering, overlay logic
- `packages/game/src/helpers/helpers.ts` — `findPossibleDestinations` (BFS)
- `packages/game/src/data/tileDefinitions.ts` — `blocked` arrays per tile

### Dependencies
- dnd-kit already installed (`@dnd-kit/core`)
- No additional libraries needed (SVG overlay is pure React)

## Reference
- Advance Wars (GBA) — unit movement range visualization
- Rules: "A Fleet may move up to four map squares, through their edges or diagonally, but not across mountain ranges unless entirely unladen"
- Mountain ranges: "Triangular peak symbols populating edges or corners of some map squares: these block laden Fleet movement and tracing of Trade Routes"
