import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { MyGameState } from "../types";
import legacyResolutions from "./legacyResolutions";

const resolveRound = (G: MyGameState, events: EventsAPI) => {
  const resourceCounterMap: Record<string, number> = {
    mithril: 0,
    dragonScales: 0,
    krakenSkin: 0,
    magicDust: 0,
    stickyIchor: 0,
    pipeweed: 0,
  };

  Object.values(G.playerInfo).forEach((player) => {
    Object.entries(player.resources).forEach(([resourceName, value]) => {
      if (resourceCounterMap[resourceName] !== undefined) {
        resourceCounterMap[resourceName] += value;
      }
    });
  });

  const finalValuesMap: Record<string, number> = {
    mithril: magicDustAndMithrilValueCalculator(resourceCounterMap["mithril"]),
    dragonScales: krakenSkinAndDragonScalesValueCalculator(
      resourceCounterMap["dragonScales"]
    ),
    krakenSkin: krakenSkinAndDragonScalesValueCalculator(
      resourceCounterMap["krakenSkin"]
    ),
    magicDust: magicDustAndMithrilValueCalculator(
      resourceCounterMap["magicDust"]
    ),
    stickyIchor: stickyIchorAndPipeweedValueCalculator(
      resourceCounterMap["stickyIchor"]
    ),
    pipeweed: stickyIchorAndPipeweedValueCalculator(
      resourceCounterMap["pipeweed"]
    ),
  };
  const tradeGainsMap: Record<string, number> = {};

  Object.values(G.playerInfo).forEach((player) => {
    Object.entries(player.resources).forEach(([resourceName, value]) => {
      if (finalValuesMap[resourceName] !== undefined) {
        player.resources.gold += finalValuesMap[resourceName] * value;
        if (tradeGainsMap[player.id] === undefined) {
          tradeGainsMap[player.id] = value;
        } else {
          tradeGainsMap[player.id] += value;
        }
      }
    });

    if (player.resources.gold <= 0) {
      player.resources.victoryPoints -= Math.floor(
        Math.abs(player.resources.gold / 2)
      );
    }

    player.resources.dragonScales = 0;
    player.resources.stickyIchor = 0;
    player.resources.krakenSkin = 0;
    player.resources.pipeweed = 0;
    player.resources.magicDust = 0;
    player.resources.mithril = 0;
  });

  const tradeAmounts = [...Object.values(tradeGainsMap)];
  const highestTradeAmount = Math.max(...tradeAmounts);

  if (highestTradeAmount === 0) return;

  while (tradeAmounts.includes(highestTradeAmount)) {
    tradeAmounts.splice(tradeAmounts.indexOf(highestTradeAmount), 1);
  }

  const secondHighestTradeAmount = Math.max(...tradeAmounts);

  while (tradeAmounts.includes(highestTradeAmount)) {
    tradeAmounts.splice(tradeAmounts.indexOf(highestTradeAmount), 1);
  }

  const thirdHighestTradeAmount = Math.max(...tradeAmounts);

  let winners: string[] = [];
  let secondPlace: string[] = [];
  let thirdPlace: string[] = [];

  Object.entries(tradeGainsMap).forEach(([id, amount]) => {
    if (amount === highestTradeAmount) {
      winners.push(id);
    } else if (amount === secondHighestTradeAmount) {
      secondPlace.push(id);
    } else if (amount === thirdHighestTradeAmount) {
      thirdPlace.push(id);
    }
  });
  const vpAmounts = tradeVictoryPoints(G);
  if (winners.length >= 3) {
    const awardedAmount = Math.round(
      (vpAmounts[0] + vpAmounts[1] + vpAmounts[2]) / winners.length
    );
    winners.forEach((id) => {
      G.playerInfo[id].resources.victoryPoints += awardedAmount;
    });
    return;
  } else if (winners.length === 2) {
    const awardedAmount = Math.round((vpAmounts[0] + vpAmounts[1]) / 2);
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

  if (G.round === G.finalRound) {
    legacyResolutions(G);
    events.endGame();
  }
};

export default resolveRound;

const magicDustAndMithrilValueCalculator = (abundance: number) => {
  if (abundance <= 1) {
    return 4;
  } else if (abundance <= 3) {
    return 3;
  } else {
    return 2;
  }
};

const krakenSkinAndDragonScalesValueCalculator = (abundance: number) => {
  if (abundance <= 2) {
    return 3;
  } else if (abundance <= 5) {
    return 2;
  } else {
    return 1;
  }
};

const stickyIchorAndPipeweedValueCalculator = (abundance: number) => {
  if (abundance <= 1) {
    return 3;
  } else if (abundance <= 4) {
    return 2;
  } else {
    return 1;
  }
};

const tradeVictoryPoints = (G: MyGameState) => {
  if (G.round === 1) {
    return [6, 4, 2];
  } else if (G.round < 4) {
    return [9, 6, 3];
  } else if (G.round < 6) {
    return [12, 8, 4];
  } else return [15, 10, 5];
};
