import type { MyGameState } from "../types.js";

export interface RepublicInfluence {
  zeeland: {
    alignment: "heretic" | "orthodox";
    influenced: boolean;
    supporting: boolean;
  };
  venoa: {
    alignment: "heretic" | "orthodox";
    influenced: boolean;
    supporting: boolean;
  };
}

export function getRepublicInfluence(
  G: MyGameState,
  playerID: string
): RepublicInfluence {
  const player = G.playerInfo[playerID];
  const playerAlignment = player.hereticOrOrthodox;

  const zeelandHeretic = G.eventState.nprHeretic.includes("Zeeland");
  const zeelandAlignment: "heretic" | "orthodox" = zeelandHeretic ? "heretic" : "orthodox";
  const zeelandInfluenced = G.boardState.influencePrelates[4] === playerID;
  const zeelandSupporting = zeelandAlignment === playerAlignment || zeelandInfluenced;

  const venoaHeretic = G.eventState.nprHeretic.includes("Venoa");
  const venoaAlignment: "heretic" | "orthodox" = venoaHeretic ? "heretic" : "orthodox";
  const venoaInfluenced = G.boardState.influencePrelates[5] === playerID;
  const venoaSupporting = venoaAlignment === playerAlignment || venoaInfluenced;

  return {
    zeeland: {
      alignment: zeelandAlignment,
      influenced: zeelandInfluenced,
      supporting: zeelandSupporting,
    },
    venoa: {
      alignment: venoaAlignment,
      influenced: venoaInfluenced,
      supporting: venoaSupporting,
    },
  };
}

export function countRepublicSupport(G: MyGameState, playerID: string): number {
  const { zeeland, venoa } = getRepublicInfluence(G, playerID);
  let count = 0;
  if (zeeland.supporting) count++;
  if (venoa.supporting) count++;
  return count;
}

export function hasFullRepublicAccess(G: MyGameState, playerID: string): boolean {
  const { zeeland, venoa } = getRepublicInfluence(G, playerID);
  return zeeland.supporting && venoa.supporting;
}
