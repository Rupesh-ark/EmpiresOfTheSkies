import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { MyGameState, GoodKey } from "../types";
import legacyResolutions from "./legacyResolutions";
import { enactPiracy } from "./piracy";

const ALL_GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

// B2: factory income — pool = total outposts + colonies on map
const collectFactoryIncome = (G: MyGameState) => {
  let pool = 0;
  G.mapState.buildings.forEach((row) => {
    row.forEach((cell) => {
      if (cell.buildings === "outpost" || cell.buildings === "colony") {
        pool += 1;
      }
    });
  });

  const sortedPlayers = Object.values(G.playerInfo).sort((a, b) => {
    if (b.factories !== a.factories) return b.factories - a.factories;
    return G.turnOrder.indexOf(a.id) - G.turnOrder.indexOf(b.id);
  });

  // GAP-4: repeat the cycle until the pool is exhausted
  while (pool > 0) {
    sortedPlayers.forEach((player) => {
      if (pool <= 0) return;
      const income = Math.min(player.factories, pool);
      player.resources.gold += income;
      pool -= income;
    });
  }
};

// D4: player with most palaces scores (their count − 2nd highest) VP; tied = nobody scores
const palaceBonus = (G: MyGameState) => {
  const counts = Object.values(G.playerInfo).map((p) => p.palaces);
  const highest = Math.max(...counts);
  if (highest === 0) return;

  const playersWithMost = Object.values(G.playerInfo).filter(
    (p) => p.palaces === highest
  );
  if (playersWithMost.length > 1) return;

  const secondHighest = Math.max(...counts.filter((c) => c !== highest), 0);
  playersWithMost[0].resources.victoryPoints += highest - secondHighest;
};

// D3: only players with ≥1 outpost or colony are eligible for trade VP ranking
const hasTradeAccess = (G: MyGameState, playerID: string): boolean => {
  for (const row of G.mapState.buildings) {
    for (const cell of row) {
      if (
        cell.player?.id === playerID &&
        (cell.buildings === "outpost" || cell.buildings === "colony")
      ) {
        return true;
      }
    }
  }
  return false;
};

// D7: final round bonus — 1 VP per 5 Gold
const applyFinalRoundBonus = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    player.resources.victoryPoints += Math.floor(player.resources.gold / 5);
  });
};

// BUG-2: heresy track VP scored every round
// orthodoxVP(h): h≤-3 → -h-2, h≥4 → 3-h, else 0
// hereticVP(h) = -orthodoxVP(h)
const scoreHeresyTrackVP = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    const h = player.heresyTracker;
    let orthodoxVP: number;
    if (h <= -3) {
      orthodoxVP = -h - 2;
    } else if (h >= 4) {
      orthodoxVP = 3 - h;
    } else {
      orthodoxVP = 0;
    }
    const vp =
      player.hereticOrOrthodox === "orthodox" ? orthodoxVP : -orthodoxVP;
    player.resources.victoryPoints += vp;
  });
};

const resolveRound = (G: MyGameState, events: EventsAPI, random: RandomAPI) => {
  // GAP-15 sub-rule 3: failed conquest records are per-round only
  G.failedConquests = [];
  scoreHeresyTrackVP(G);
  palaceBonus(G);

  // GAP-9: licenced_smugglers KA — grant +1 good before goods are sold
  Object.values(G.playerInfo).forEach((player) => {
    if (player.resources.advantageCard !== "licenced_smugglers") return;
    const choice = player.resources.smugglerGoodChoice ?? ALL_GOODS[Math.floor(random.Number() * ALL_GOODS.length)];
    player.resources[choice] += 1;
    player.resources.smugglerGoodChoice = undefined;
  });

  // D1: price marker lookup — replaces abundance functions
  const goodsKeys = Object.keys(G.mapState.goodsPriceMarkers) as Array<
    keyof typeof G.mapState.goodsPriceMarkers
  >;
  const tradeGainsMap: Record<string, number> = {};

  Object.values(G.playerInfo).forEach((player) => {
    const canTrade = hasTradeAccess(G, player.id);

    goodsKeys.forEach((good) => {
      const quantity = player.resources[good];
      if (quantity > 0) {
        player.resources.gold += G.mapState.goodsPriceMarkers[good] * quantity;
        // D3: only eligible players enter the trade VP ranking
        if (canTrade) {
          tradeGainsMap[player.id] = (tradeGainsMap[player.id] ?? 0) + quantity;
        }
      }
    });

    player.resources.dragonScales = 0;
    player.resources.stickyIchor = 0;
    player.resources.krakenSkin = 0;
    player.resources.pipeweed = 0;
    player.resources.magicDust = 0;
    player.resources.mithril = 0;
  });

  // B7: piracy — after goods sold, before factory income
  enactPiracy(G);

  // B2: factory income
  collectFactoryIncome(G);

  // D8: debt penalty — gold < 0 only (not at exactly 0)
  Object.values(G.playerInfo).forEach((player) => {
    if (player.resources.gold < 0) {
      player.resources.victoryPoints -= Math.floor(
        Math.abs(player.resources.gold) / 2
      );
    }
  });

  // GAP-16: VP floor of 0
  Object.values(G.playerInfo).forEach((player) => {
    player.resources.victoryPoints = Math.max(0, player.resources.victoryPoints);
  });

  const tradeAmounts = [...Object.values(tradeGainsMap)];
  const highestTradeAmount = Math.max(...tradeAmounts);

  if (highestTradeAmount > 0) {
    while (tradeAmounts.includes(highestTradeAmount)) {
      tradeAmounts.splice(tradeAmounts.indexOf(highestTradeAmount), 1);
    }
    const secondHighestTradeAmount = Math.max(...tradeAmounts);

    while (tradeAmounts.includes(secondHighestTradeAmount)) {
      tradeAmounts.splice(tradeAmounts.indexOf(secondHighestTradeAmount), 1);
    }
    const thirdHighestTradeAmount = Math.max(...tradeAmounts);

    const winners: string[] = [];
    const secondPlace: string[] = [];
    const thirdPlace: string[] = [];

    Object.entries(tradeGainsMap).forEach(([id, amount]) => {
      if (amount === highestTradeAmount) {
        winners.push(id);
      } else if (amount === secondHighestTradeAmount) {
        secondPlace.push(id);
      } else if (amount === thirdHighestTradeAmount) {
        thirdPlace.push(id);
      }
    });

    // D2: corrected VP amounts per round
    const vpAmounts = tradeVictoryPoints(G);
    if (winners.length >= 3) {
      // GAP-12: Math.ceil for tied trade VP splits
      const awardedAmount = Math.ceil(
        (vpAmounts[0] + vpAmounts[1] + vpAmounts[2]) / winners.length
      );
      winners.forEach((id) => {
        G.playerInfo[id].resources.victoryPoints += awardedAmount;
      });
    } else if (winners.length === 2) {
      const awardedAmount = Math.ceil((vpAmounts[0] + vpAmounts[1]) / 2);
      winners.forEach((id) => {
        G.playerInfo[id].resources.victoryPoints += awardedAmount;
      });
      if (secondHighestTradeAmount > 0) {
        const awardAmountSecondPlace = Math.ceil(
          vpAmounts[2] / secondPlace.length
        );
        secondPlace.forEach((id) => {
          G.playerInfo[id].resources.victoryPoints += awardAmountSecondPlace;
        });
      }
    } else if (winners.length === 1) {
      G.playerInfo[winners[0]].resources.victoryPoints += vpAmounts[0];

      if (secondPlace.length === 1) {
        if (secondHighestTradeAmount > 0) {
          G.playerInfo[secondPlace[0]].resources.victoryPoints += vpAmounts[1];
        }
        if (thirdHighestTradeAmount > 0) {
          const awardAmountThirdPlace = Math.ceil(
            vpAmounts[2] / thirdPlace.length
          );
          thirdPlace.forEach((id) => {
            G.playerInfo[id].resources.victoryPoints += awardAmountThirdPlace;
          });
        }
      } else if (secondPlace.length > 1) {
        const awardAmountSecondPlace = Math.round(
          (vpAmounts[1] + vpAmounts[2]) / secondPlace.length
        );
        secondPlace.forEach((id) => {
          G.playerInfo[id].resources.victoryPoints += awardAmountSecondPlace;
        });
      }
    }
  }

  if (G.round === G.finalRound) {
    applyFinalRoundBonus(G);
    legacyResolutions(G);
    // GAP-17: final score tie-break — most Gold, then earliest IPO position
    const ranking = Object.values(G.playerInfo)
      .sort((a, b) => {
        if (b.resources.victoryPoints !== a.resources.victoryPoints)
          return b.resources.victoryPoints - a.resources.victoryPoints;
        if (b.resources.gold !== a.resources.gold)
          return b.resources.gold - a.resources.gold;
        return G.turnOrder.indexOf(a.id) - G.turnOrder.indexOf(b.id);
      })
      .map((p) => p.id);
    events.endGame({ ranking });
  }
};

export default resolveRound;

// D2: corrected trade VP schedule
const tradeVictoryPoints = (G: MyGameState) => {
  if (G.round === 1) {
    return [3, 2, 1];
  } else if (G.round <= 3) {
    return [6, 4, 2];
  } else if (G.round <= 5) {
    return [9, 6, 3];
  } else {
    return [12, 8, 4];
  }
};