/**
 * TradeRouteOverlay — draws trade routes as routes.
 *
 * A route is "a contiguous chain from that Land leading back to Faithdom,
 * through edges and/or diagonally through corners" (eots42). Each skyship in
 * the chain was drawn as an independent disc, so six links of one route looked
 * like six unrelated markers — and a chain broken by piracy looked exactly
 * like a working one. Drawing the segments makes both the route and the gap
 * visible.
 *
 * Legality comes from `getPassableNeighbors`, not raw adjacency: the rulebook
 * forbids tracing a chain through mountain edges, so a link the engine won't
 * honour must not be drawn as one. That helper also applies the map's
 * horizontal wrap, which is why wrapped links are drawn as two edge stubs
 * rather than one line straight back across the board.
 *
 * Coordinates are grid units (viewBox 0 0 cols rows), so this scales with the
 * grid at any zoom without recomputing pixels.
 */
import { MyGameState, tileKey, FAITHDOM_TILES, getPassableNeighbors } from "@eots/game";

interface Segment {
  from: [number, number];
  to: [number, number];
  colour: string;
  mine: boolean;
  /** Link crosses the map's left/right seam — drawn as two stubs */
  wrapped: boolean;
}

export const TradeRouteOverlay = ({
  G,
  playerID,
  cols,
  rows,
  preview,
}: {
  G: MyGameState;
  playerID: string | null;
  cols: number;
  rows: number;
  /** A chain being considered but not yet committed, in the owner's colour */
  preview?: { tiles: number[][]; colour: string } | null;
}) => {
  const tileArray = G.mapState.currentTileArray;

  // A chain may terminate at Faithdom or at one of that player's own claims.
  const anchors = new Map<string, Set<string>>();
  for (const pid of Object.keys(G.playerInfo)) {
    anchors.set(pid, new Set(FAITHDOM_TILES.map(([x, y]) => tileKey(x, y))));
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = G.mapState.buildings[y]?.[x];
      const owner = cell?.player?.id;
      if (owner && (cell.buildings === "outpost" || cell.buildings === "colony")) {
        anchors.get(owner)?.add(tileKey(x, y));
      }
    }
  }

  const routeTiles = new Map<string, Set<string>>();
  for (const [key, pids] of Object.entries(G.mapState.routeSkyships)) {
    for (const pid of pids) {
      if (!routeTiles.has(pid)) routeTiles.set(pid, new Set());
      routeTiles.get(pid)!.add(key);
    }
  }

  const segments: Segment[] = [];
  const drawn = new Set<string>();

  for (const [pid, tiles] of routeTiles) {
    const colour = G.playerInfo[pid]?.colour ?? "#888";
    const mine = pid === playerID;
    const endpoints = anchors.get(pid) ?? new Set<string>();

    for (const key of tiles) {
      const [x, y] = key.split(",").map(Number);
      for (const [nx, ny] of getPassableNeighbors(x, y, tileArray)) {
        const nKey = tileKey(nx, ny);
        // Link to another of this player's skyships, or to a chain endpoint.
        if (!tiles.has(nKey) && !endpoints.has(nKey)) continue;
        const pair = [key, nKey].sort().join("|");
        if (drawn.has(`${pid}:${pair}`)) continue;
        drawn.add(`${pid}:${pair}`);
        segments.push({
          from: [x, y],
          to: [nx, ny],
          colour,
          mine,
          wrapped: Math.abs(nx - x) > 1,
        });
      }
    }
  }

  if (segments.length === 0 && !preview?.tiles.length) return null;

  // Rivals' chains sit behind yours but stay visible — piracy targets theirs.
  const ordered = [...segments].sort((a, b) => Number(a.mine) - Number(b.mine));

  const line = (
    x1: number, y1: number, x2: number, y2: number,
    s: Segment, key: string
  ) => (
    <g key={key}>
      {/* Dark casing so the line reads over ocean and land alike */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={s.mine ? 6 : 4.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={s.colour}
        strokeWidth={s.mine ? 3 : 2}
        strokeLinecap="round"
        strokeDasharray={s.mine ? undefined : "5 4"}
        opacity={s.mine ? 0.95 : 0.5}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}
    >
      {/* Prospective chain: where these skyships would sit if left behind */}
      {preview?.tiles.map(([x, y], i) => (
        <g key={`p${i}`}>
          <circle
            cx={x + 0.5} cy={y + 0.5} r={0.17}
            fill={preview.colour} fillOpacity={0.35}
            stroke={preview.colour} strokeWidth={2.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          {i > 0 && (
            <line
              x1={preview.tiles[i - 1][0] + 0.5} y1={preview.tiles[i - 1][1] + 0.5}
              x2={x + 0.5} y2={y + 0.5}
              stroke={preview.colour} strokeWidth={3} strokeDasharray="5 4"
              strokeLinecap="round" opacity={0.8}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      ))}

      {ordered.flatMap((s, i) => {
        const [fx, fy] = s.from;
        const [tx, ty] = s.to;
        const y1 = fy + 0.5;
        const y2 = ty + 0.5;
        if (!s.wrapped) {
          return [line(fx + 0.5, y1, tx + 0.5, y2, s, `s${i}`)];
        }
        // Wrapped: run each end off its own edge so the chain reads as
        // continuing round the world rather than doubling back across it.
        const goingRight = fx > tx;
        return [
          line(fx + 0.5, y1, goingRight ? cols : 0, (y1 + y2) / 2, s, `s${i}a`),
          line(goingRight ? 0 : cols, (y1 + y2) / 2, tx + 0.5, y2, s, `s${i}b`),
        ];
      })}
    </svg>
  );
};
