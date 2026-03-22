import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { HERESY_MIN, logEvent } from "../../helpers/stateUtils";

/**
 * Vote move for the immediate election triggered by "Archprelate Dies".
 * Same tally logic as the regular election, but runs within the events phase.
 * No bribes — players vote with their own cathedral influence only.
 * Turn-based: each player votes in turn order.
 */
const immediateElectionVote: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    if (!G.eventState.immediateElectionPending) return INVALID_MOVE;
    if (G.hasVoted.includes(playerID)) return INVALID_MOVE;

    const kingdomVotedFor: string = args[0];
    // Validate the vote target is a valid player kingdom
    const validKingdoms: string[] = Object.values(G.playerInfo).map((p) => p.kingdomName);
    if (!validKingdoms.includes(kingdomVotedFor)) return INVALID_MOVE;

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

    G.voteSubmitted[playerID] = kingdomVotedFor;
    G.hasVoted.push(playerID);

    if (G.hasVoted.length < ctx.playOrder.length) {
      // More players need to vote — advance to next player
      const currentIdx = ctx.playOrder.indexOf(playerID);
      const nextIdx = (currentIdx + 1) % ctx.playOrder.length;
      events.endTurn({ next: ctx.playOrder[nextIdx] });
      return;
    }

    // All players have voted — tally
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

      const schismBlocked = G.eventState.schismAffected.includes(pid);

      if (!isInfluenced && !schismBlocked) {
        votes += G.playerInfo[pid].cathedrals;
      }

      Object.values(G.playerInfo).forEach((kingdom) => {
        if (kingdomsUnderOurInfluence.includes(kingdom.kingdomName)) {
          if (!G.eventState.schismAffected.includes(kingdom.id)) {
            votes += kingdom.cathedrals;
          }
        }
      });

      // NPR kingdoms under our influence
      kingdomsUnderOurInfluence.forEach((kName) => {
        const nprVotes = G.nprCathedrals[kName];
        if (nprVotes !== undefined) {
          votes += nprVotes;
        }
      });

      if (kingdomsUnderOurInfluence.includes("Venoa")) votes += 1;
      if (kingdomsUnderOurInfluence.includes("Zeeland")) votes += 1;

      if (G.playerInfo[pid].resources.advantageCard === "patriarch_of_the_church") {
        votes += 1;
      }

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
    const highestVotes = Math.max(...Object.values(G.electionResults));
    const winners: string[] = [];
    Object.entries(G.electionResults).forEach(([id, v]) => {
      if (v === highestVotes) {
        winners.push(id);
      }
    });
    let finalWinner: string;
    if (winners.length > 1) {
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

    // Track fatigue
    let previousArchprelateKingdom: string | undefined;
    Object.values(G.playerInfo).forEach((player) => {
      if (player.isArchprelate) previousArchprelateKingdom = player.kingdomName;
    });

    // Apply results
    Object.values(G.playerInfo).forEach((player) => {
      if (player.kingdomName === finalWinner) {
        player.isArchprelate = true;
        if (player.heresyTracker > HERESY_MIN) {
          player.heresyTracker -= 1;
        }
        let orthodoxRealms = 0;
        Object.values(G.playerInfo).forEach((p) => {
          if (p.hereticOrOrthodox === "orthodox") {
            orthodoxRealms += 1;
          }
        });

        if (player.kingdomName === previousArchprelateKingdom) {
          G.consecutiveArchprelateWins += 1;
        } else {
          G.consecutiveArchprelateWins = 1;
        }
        const fatigueReduction = Math.max(0, (G.consecutiveArchprelateWins - 1) * 2);
        const baseVP = Math.min(6, Math.floor((2 * orthodoxRealms) / 3));
        const electionVP = Math.max(0, baseVP - fatigueReduction);
        player.resources.victoryPoints += electionVP;

        if (fatigueReduction > 0) {
          logEvent(G, `Emergency election: ${player.kingdomName} elected Archprelate (+${electionVP} VP, fatigue −${fatigueReduction})`);
        } else {
          logEvent(G, `Emergency election: ${player.kingdomName} elected Archprelate (+${electionVP} VP)`);
        }
      } else {
        player.isArchprelate = false;
      }
    });

    // Clear flag and exit events phase
    G.eventState.immediateElectionPending = false;
    events.endPhase();
  },
  errorMessage: "Cannot vote in emergency election",
};

export default immediateElectionVote;
