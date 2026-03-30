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

  // Store the ballot — hidden from other players until all have voted
  G.voteSubmitted[playerID] = kingdomVotedFor;
  G.hasVoted.push(playerID);

  // Only tally and resolve once every player has submitted their vote
  if (G.hasVoted.length === ctx.playOrder.length) {
    // Tally: calculate each player's votes at reveal time
    for (const [pid, target] of Object.entries(G.voteSubmitted)) {
      const kingdomName = G.playerInfo[pid].kingdomName;
      const isInfluenced =
        G.boardState.influencePrelates[kingdomToNumberMap[kingdomName]] !==
        undefined;

      const kingdomsUnderOurInfluence: string[] = [];
      Object.entries(G.boardState.influencePrelates).forEach(([index, id]) => {
        if (id === pid) {
          kingdomsUnderOurInfluence.push(numberToKingdomMap[index]);
        }
      });

      let votes = 0;

      // Schism: affected players' prelates cannot participate in election
      const schismBlocked = G.eventState.schismAffected.includes(pid);

      if (!isInfluenced && !schismBlocked) {
        votes += G.playerInfo[pid].cathedrals;
      }

      Object.values(G.playerInfo).forEach((kingdom) => {
        if (kingdomsUnderOurInfluence.includes(kingdom.kingdomName)) {
          // Schism also blocks influenced kingdoms' cathedrals
          if (!G.eventState.schismAffected.includes(kingdom.id)) {
            votes += kingdom.cathedrals;
          }
        }
      });

      // GAP-18: NPR kingdoms under our influence contribute their cathedral count
      kingdomsUnderOurInfluence.forEach((kName) => {
        const nprVotes = G.nprCathedrals[kName];
        if (nprVotes !== undefined) {
          votes += nprVotes;
        }
      });

      if (kingdomsUnderOurInfluence.includes("Venoa")) votes += 1;
      if (kingdomsUnderOurInfluence.includes("Zeeland")) votes += 1;

      // GAP-7: patriarch_of_the_church KA adds +1 permanent vote
      if (G.playerInfo[pid].resources.advantageCard === "patriarch_of_the_church") {
        votes += 1;
      }

      // Colonial Prelates: each colony adds +1 vote to its owner
      if (G.eventState.colonialPrelatesActive) {
        for (const row of G.mapState.buildings) {
          for (const tile of row) {
            if (tile.player?.id === pid && tile.buildings === "colony") {
              votes += 1;
            }
          }
        }
      }

      if (G.electionResults[target]) {
        G.electionResults[target] += votes;
      } else {
        G.electionResults[target] = votes;
      }
    }

    // Determine winner
    let highestVotes = Math.max(...Object.values(G.electionResults));
    const winners: string[] = [];
    Object.entries(G.electionResults).forEach(([id, v]) => {
      if (v === highestVotes) {
        winners.push(id);
      }
    });
    let finalWinner: string;
    if (winners.length > 1) {
      // Tie-break: incumbent keeps title
      let incumbentKingdom: string | undefined;
      Object.values(G.playerInfo).forEach((player) => {
        if (player.isArchprelate) {
          incumbentKingdom = player.kingdomName;
        }
      });
      finalWinner = incumbentKingdom ?? winners[0];
    } else {
      finalWinner = winners[0];
    }

    Object.values(G.playerInfo).forEach((player) => {
      if (player.kingdomName === finalWinner) {
        player.isArchprelate = true;
        // Elected Archprelate's heresy marker retreats one space
        if (player.heresyTracker > HERESY_MIN) {
          player.heresyTracker -= 1;
        }
        let orthodoxRealms = 0;
        Object.values(G.playerInfo).forEach((p) => {
          if (p.hereticOrOrthodox === "orthodox") {
            orthodoxRealms += 1;
          }
        });
        // Rule: floor(2 × orthodoxRealms / 3), maximum 6 VP
        const electionVP = Math.min(6, Math.floor((2 * orthodoxRealms) / 3));
        player.resources.victoryPoints += electionVP;
        logEvent(G, `Archprelate elected: ${player.kingdomName} (+${electionVP} VP)`);
      } else {
        player.isArchprelate = false;
      }
    });

    events.endPhase();
  }
  // No else branch: activePlayers with moveLimit:1 handles per-player turn management
};

export default vote;
