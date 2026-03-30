import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { HERESY_MIN, logEvent } from "../../helpers/stateUtils";

const vote: Move<MyGameState> = (
  { G, ctx, playerID, events },
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

  // Schism: affected players' prelates cannot participate in election
  const schismBlocked = G.eventState.schismAffected.includes(playerID);

  if (!isInfluenced && !schismBlocked) {
    votes += G.playerInfo[playerID].cathedrals;
  }

  Object.values(G.playerInfo).forEach((kingdom) => {
    if (kingdomsUnderOurInfluence.includes(kingdom.kingdomName)) {
      // Schism also blocks influenced kingdoms if the influencer is schism-affected
      if (!G.eventState.schismAffected.includes(kingdom.id)) {
        votes += kingdom.cathedrals;
      }
    }
  });

  // GAP-18: NPR player-type kingdoms under our influence contribute their cathedral count
  kingdomsUnderOurInfluence.forEach((kName) => {
    const nprVotes = G.nprCathedrals[kName];
    if (nprVotes !== undefined) {
      votes += nprVotes;
    }
  });

  if (kingdomsUnderOurInfluence.includes("Venoa")) votes += 1;
  if (kingdomsUnderOurInfluence.includes("Zeeland")) votes += 1;

  // GAP-7: patriarch_of_the_church KA adds +1 permanent vote
  if (G.playerInfo[playerID].resources.advantageCard === "patriarch_of_the_church") {
    votes += 1;
  }

  // Colonial Prelates: each colony adds +1 vote to its owner
  if (G.eventState.colonialPrelatesActive) {
    for (const row of G.mapState.buildings) {
      for (const tile of row) {
        if (tile.player?.id === playerID && tile.buildings === "colony") {
          votes += 1;
        }
      }
    }
  }

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
          finalWinner = player.kingdomName;
        }
      });
    } else finalWinner = winners[0];

    Object.values(G.playerInfo).forEach((player) => {
      if (player.kingdomName === finalWinner) {
        player.isArchprelate = true;
        // Elected Archprelate's heresy marker retreats one space
        if (player.heresyTracker > HERESY_MIN) {
          player.heresyTracker -= 1;
        }
        let orthodoxRealms = 0;
        Object.values(G.playerInfo).forEach((player) => {
          if (player.hereticOrOrthodox === "orthodox") {
            orthodoxRealms += 1;
          }
        });
        // Rule: floor(2 × orthodoxRealms / 3), maximum 6 VP
        const electionVP = Math.min(6, Math.floor((2 * orthodoxRealms) / 3));
        player.resources.victoryPoints += electionVP;
        logEvent(G, `Archprelate elected: ${player.kingdomName} (+${electionVP} VP)`);
      } else player.isArchprelate = false;
    });

    events.endPhase();
  } else {
    events.endTurn();
  }
};

export default vote;
