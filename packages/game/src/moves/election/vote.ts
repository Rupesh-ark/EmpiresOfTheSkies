import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const vote: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const kingdomVotedFor = args[0];

  const kingdomToNumberMap: Record<
    string,
    keyof typeof G.boardState.influencePrelates
  > = {
    Angland: 1,
    Gallois: 2,
    Castillia: 3,
    Zeeland: 4,
    Venoa: 5,
    Nordmark: 6,
    Ostreich: 7,
    Constantium: 8,
  };
  const numberToKingdomMap: Record<string, string> = {
    1: "Angland",
    2: "Gallois",
    3: "Castillia",
    4: "Zeeland",
    5: "Venoa",
    6: "Nordmark",
    7: "Ostreich",
    8: "Constantium",
  };

  const kingdomName = G.playerInfo[playerID].kingdomName;
  const isInfluenced =
    G.boardState.influencePrelates[kingdomToNumberMap[kingdomName]] !==
    undefined;

  const kingdomsUnderOurInfluence: string[] = [];

  Object.entries(G.boardState.influencePrelates).forEach(([index, id]) => {
    if (id === playerID) {
      kingdomsUnderOurInfluence.push(numberToKingdomMap[index]);
    }
  });

  let votes = 0;

  if (!isInfluenced) {
    votes += G.playerInfo[playerID].cathedrals;
  }

  Object.values(G.playerInfo).forEach((kingdom) => {
    if (kingdomsUnderOurInfluence.includes(kingdom.kingdomName)) {
      votes += kingdom.cathedrals;
    }
  });

  if (kingdomsUnderOurInfluence.includes("Venoa")) votes += 1;
  if (kingdomsUnderOurInfluence.includes("Zeeland")) votes += 1;

  if (G.electionResults[kingdomVotedFor]) {
    G.electionResults[kingdomVotedFor] += votes;
  } else G.electionResults[kingdomVotedFor] = votes;
  G.hasVoted.push(playerID);

  if (G.hasVoted.length === ctx.playOrder.length) {
    let highestVotes = Math.max(...Object.values(G.electionResults));
    const winners: string[] = [];
    Object.entries(G.electionResults).forEach(([id, votes]) => {
      if (votes === highestVotes) {
        winners.push(id);
      }
    });
    let finalWinner: string;
    if (winners.length > 1) {
      Object.values(G.playerInfo).forEach((player) => {
        if (player.isArchprelate) {
          finalWinner = player.id;
        }
      });
    } else finalWinner = winners[0];

    Object.values(G.playerInfo).forEach((player) => {
      if (player.id === finalWinner) {
        player.isArchprelate = true;
        let orthodoxRealms = 0;
        Object.values(G.playerInfo).forEach((player) => {
          if (player.hereticOrOrthodox === "orthodox") {
            orthodoxRealms += 1;
          }
        });
        player.resources.victoryPoints += Math.floor(orthodoxRealms / 3);
      } else player.isArchprelate = false;
    });

    events.endPhase();
  } else {
    events.endTurn();
  }
};

export default vote;
