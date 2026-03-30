import { MyGameState, PlayerInfo, LegacyCardInfo, LegacyCardName } from "../types";
import { bfsReachable, FAITHDOM_TILES, tileKey } from "./piracy";

// Each resolver returns the raw VP earned — no state mutation.
// resolveCardWithAlignmentPenalty applies the halving penalty before committing.
type CardResolver = (player: PlayerInfo, G: MyGameState) => number;

// Shared helper: total trade goods on tiles connected to Faithdom via the player's fleet chain.
const tradeRouteGoods = (player: PlayerInfo, G: MyGameState): number => {
  const network = new Set<string>();
  FAITHDOM_TILES.forEach(([x, y]) => network.add(tileKey(x, y)));
  player.fleetInfo.forEach((fleet) => {
    if (fleet.skyships > 0) {
      network.add(tileKey(fleet.location[0], fleet.location[1]));
    }
  });

  let total = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const building = G.mapState.buildings[y][x];
      if (building.player?.id !== player.id || !building.buildings) continue;

      const routeNetwork = new Set(network);
      routeNetwork.add(tileKey(x, y));
      if (!bfsReachable(FAITHDOM_TILES, routeNetwork).has(tileKey(x, y))) continue;

      const loot = G.mapState.currentTileArray[y][x].loot[building.buildings];
      total +=
        loot.mithril +
        loot.dragonScales +
        loot.krakenSkin +
        loot.magicDust +
        loot.stickyIchor +
        loot.pipeweed;
    }
  }
  return total;
};

export const CARD_RESOLVERS: Record<LegacyCardName, CardResolver> = {
  "the builder": (player, G) => {
    let vp = (player.cathedrals + player.palaces + player.shipyards) * 2;
    G.mapState.buildings.forEach((row) =>
      row.forEach((tile) => {
        if (tile.fort && tile.player?.id === player.id) vp += 2;
      })
    );
    return vp;
  },

  "the conqueror": (player, G) => {
    let vp = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((tile) => {
        if (tile.player?.id === player.id && tile.buildings === "colony") vp += 6;
      })
    );
    return vp;
  },

  // L8: 4 VP per Outpost and Colony
  "the navigator": (player, G) => {
    let count = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((tile) => {
        if (
          tile.player?.id === player.id &&
          (tile.buildings === "outpost" || tile.buildings === "colony")
        )
          count++;
      })
    );
    return count * 4;
  },

  "the great": (player, G) => {
    const count = (fn: (p: PlayerInfo) => number) => {
      const vals = Object.values(G.playerInfo).map(fn);
      const max = Math.max(...vals);
      return fn(player) >= max ? 4 : 0;
    };

    const skyships = (p: PlayerInfo) =>
      p.resources.skyships + p.fleetInfo.reduce((s, f) => s + f.skyships, 0);
    const regiments = (p: PlayerInfo) =>
      p.resources.regiments + p.fleetInfo.reduce((s, f) => s + f.regiments, 0);

    const mapCount = (type: "outpost" | "colony" | "fort") => (p: PlayerInfo) => {
      let n = 0;
      G.mapState.buildings.forEach((row) =>
        row.forEach((tile) => {
          if (tile.player?.id !== p.id) return;
          if (type === "fort" ? tile.fort : tile.buildings === type) n++;
        })
      );
      return n;
    };

    const tradeGoods = (p: PlayerInfo) => {
      let n = 0;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
          const b = G.mapState.buildings[y][x];
          if (!b.player || b.player.id !== p.id || !b.buildings) continue;
          const loot = G.mapState.currentTileArray[y][x].loot[b.buildings];
          n +=
            loot.mithril +
            loot.dragonScales +
            loot.krakenSkin +
            loot.magicDust +
            loot.stickyIchor +
            loot.pipeweed;
        }
      }
      return n;
    };

    return (
      count((p) => p.cathedrals) +
      count((p) => p.palaces) +
      count(skyships) +
      count(regiments) +
      count(mapCount("outpost")) +
      count(mapCount("colony")) +
      count(mapCount("fort")) +
      count(tradeGoods)
    );
  },

  "the magnificent": (player) => player.palaces * 4,

  // BUG-4: 1 VP per trade good in active trade route (same as navigator)
  "the merchant": (player, G) => tradeRouteGoods(player, G),

  "the mighty": (player, G) => {
    let vp = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((tile) => {
        if (tile.fort && tile.player?.id === player.id) vp += 1;
      })
    );
    let totalRegiments = player.resources.regiments;
    player.fleetInfo.forEach((fleet) => {
      vp += fleet.skyships;
      totalRegiments += fleet.regiments;
    });
    vp += Math.floor(totalRegiments / 3);
    return vp;
  },

  "the aviator": (player) => {
    let vp = player.resources.skyships;
    player.fleetInfo.forEach((fleet) => (vp += fleet.skyships));
    return vp;
  },

  "the pious": (player) => player.cathedrals * 4,
};

// GAP-3: apply alignment penalty — wrong alignment (Orthodox+orange or Heretic+purple)
// halves the VP, rounded up.
export const resolveCardWithAlignmentPenalty = (
  player: PlayerInfo,
  G: MyGameState,
  card: LegacyCardInfo
): void => {
  const rawVP = CARD_RESOLVERS[card.name](player, G);
  const wrongAlignment =
    (player.hereticOrOrthodox === "orthodox" && card.colour === "orange") ||
    (player.hereticOrOrthodox === "heretic" && card.colour === "purple");
  player.resources.victoryPoints += wrongAlignment ? Math.ceil(rawVP / 2) : rawVP;
};