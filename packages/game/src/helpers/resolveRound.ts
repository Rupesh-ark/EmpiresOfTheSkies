import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { MyGameState, GoodKey } from "../types";
import legacyResolutions from "./legacyResolutions";
import { enactPiracy } from "./piracy";
import { grantTradeRouteGoods } from "./tradeRouteResolver";
import { countActiveTradeRoutes } from "./mapUtils";
import { removeVPAmount, logEvent } from "./stateUtils";
import { FINAL_ROUND_GOLD_PER_VP, DEBT_PENALTY_DIVISOR, TRADE_VP_SCHEDULE, PRICE_MARKER_MAX } from "../data/gameData";

const ALL_GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

// B2: factory income — pool = total outposts + colonies on map
// Engaged Factories rule: each player's effective factory count is capped
// at their number of active trade routes (connected outposts/colonies).
const collectFactoryIncome = (G: MyGameState) => {
  let pool = 0;
  G.mapState.buildings.forEach((row) => {
    row.forEach((cell) => {
      if (cell.buildings === "outpost" || cell.buildings === "colony") {
        pool += 1;
      }
    });
  });

  // Compute effective factories per player (capped at active trade routes)
  const effectiveFactories: Record<string, number> = {};
  for (const player of Object.values(G.playerInfo)) {
    const routes = countActiveTradeRoutes(G, player.id);
    const effective = Math.min(player.factories, routes);
    effectiveFactories[player.id] = effective;
    if (effective < player.factories) {
      logEvent(
        G,
        `Engaged Factories: ${player.kingdomName} has ${player.factories} factories but only ${routes} active routes — capped at ${effective}`,
      );
    }
  }

  const sortedPlayers = Object.values(G.playerInfo).sort((a, b) => {
    const aEff = effectiveFactories[a.id];
    const bEff = effectiveFactories[b.id];
    if (bEff !== aEff) return bEff - aEff;
    return G.turnOrder.indexOf(a.id) - G.turnOrder.indexOf(b.id);
  });

  // GAP-4: repeat the cycle until the pool is exhausted
  // GAP-F1: guard against infinite loop when all players have 0 factories
  while (pool > 0) {
    let distributed = 0;
    sortedPlayers.forEach((player) => {
      if (pool <= 0) return;
      const income = Math.min(effectiveFactories[player.id], pool);
      player.resources.gold += income;
      pool -= income;
      distributed += income;
    });
    if (distributed === 0) break;
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
  const bonus = highest - secondHighest;
  playersWithMost[0].resources.victoryPoints += bonus;
  logEvent(G, `Palace bonus: ${playersWithMost[0].kingdomName} +${bonus} VP`);
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
    player.resources.victoryPoints += Math.floor(player.resources.gold / FINAL_ROUND_GOLD_PER_VP);
  });
};

// BUG-2: heresy track VP scored every round.
// Track is 19 spaces: h in [-9, +9]. orthodoxVP = -h (so orthodox gains at h<0,
// heretic gains at h>0, both score 0 at h=0).
const scoreHeresyTrackVP = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    const h = player.heresyTracker;
    const vp = player.hereticOrOrthodox === "orthodox" ? -h : h;
    player.resources.victoryPoints += vp;
    if (vp !== 0) {
      logEvent(G, `Heresy VP: ${player.kingdomName} ${vp > 0 ? "+" : ""}${vp} VP`);
    }
  });
};

const resolveRound = (G: MyGameState, events: EventsAPI, random: RandomAPI) => {
  // GAP-15 sub-rule 3: failed conquest records are per-round only
  G.failedConquests = [];
  scoreHeresyTrackVP(G);
  palaceBonus(G);

  // GAP-RES1: grant goods from connected trade routes (recalculated each round)
  grantTradeRouteGoods(G);

  // GAP-9: licenced_smugglers KA — grant +1 good before goods are sold
  // GAP-RES5: record which good each smuggler received so we can recover the
  // price marker after selling (smugglerGoodChoice is cleared here, so we
  // cannot read it again after the loop)
  const smugglerGoods: Record<string, GoodKey> = {};
  Object.values(G.playerInfo).forEach((player) => {
    if (player.resources.advantageCard !== "licenced_smugglers") return;
    const choice = player.resources.smugglerGoodChoice ?? ALL_GOODS[Math.floor(random.Number() * ALL_GOODS.length)];
    player.resources[choice] += 1;
    smugglerGoods[player.id] = choice;
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

  // GAP-RES5: price markers recover after smuggler goods sold (v4.2 line 257)
  // The smuggled cube was temporary supply — once it is sold the marker moves
  // right by 1 (toward expensive) to undo the supply-side depression it caused.
  // Cap at 4 (the maximum price on the Sell Goods track).
  Object.values(smugglerGoods).forEach((good) => {
    G.mapState.goodsPriceMarkers[good] = Math.min(PRICE_MARKER_MAX, G.mapState.goodsPriceMarkers[good] + 1);
  });

  // B7: piracy — after goods sold, before factory income
  enactPiracy(G);

  // B2: factory income
  collectFactoryIncome(G);

  // D8: debt penalty — gold < 0 only (not at exactly 0)
  // GAP-16: VP floor enforced inside removeVPAmount
  Object.values(G.playerInfo).forEach((player) => {
    if (player.resources.gold < 0) {
      const penalty = Math.floor(Math.abs(player.resources.gold) / DEBT_PENALTY_DIVISOR);
      removeVPAmount(G, player.id, penalty);
      if (penalty > 0) {
        logEvent(G, `Debt penalty: ${player.kingdomName} -${penalty} VP`);
      }
    }
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
        // GAP-12: rule says "rounding up" — use ceil not round
        const awardAmountSecondPlace = Math.ceil(
          (vpAmounts[1] + vpAmounts[2]) / secondPlace.length
        );
        secondPlace.forEach((id) => {
          G.playerInfo[id].resources.victoryPoints += awardAmountSecondPlace;
        });
      }
    }
  }

  // Log trade VP results
  if (highestTradeAmount > 0) {
    Object.entries(tradeGainsMap).forEach(([id, amount]) => {
      if (amount > 0) {
        logEvent(G, `Trade: ${G.playerInfo[id].kingdomName} \u2014 ${amount} goods traded`);
      }
    });
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

// D2: corrected trade VP schedule — lookup from TRADE_VP_SCHEDULE
const tradeVictoryPoints = (G: MyGameState): [number, number, number] => {
  const thresholds = Object.keys(TRADE_VP_SCHEDULE)
    .map(Number)
    .sort((a, b) => b - a);
  for (const t of thresholds) {
    if (G.round >= t) return TRADE_VP_SCHEDULE[t];
  }
  return TRADE_VP_SCHEDULE[thresholds[thresholds.length - 1]];
};