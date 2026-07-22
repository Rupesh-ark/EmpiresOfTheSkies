import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, MyGameState } from "../../types.js";
import { HERESY_MIN, logEvent } from "../../helpers/stateUtils.js";
import { countOrthodoxRealms } from "../../helpers/helpers.js";

const kingdomToNumberMap: Record<string, number> = {
  Angland: 1,
  Gallois: 2,
  Castillia: 3,
  Zeeland: 4,
  Venoa: 5,
  Normark: 6,
  Ostreich: 7,
  Constantium: 8,
};

const numberToKingdomMap: Record<string, string> = {
  1: "Angland",
  2: "Gallois",
  3: "Castillia",
  4: "Zeeland",
  5: "Venoa",
  6: "Normark",
  7: "Ostreich",
  8: "Constantium",
};

function calculateVotePower(G: MyGameState, playerID: string): number {
  const playerInfo = G.playerInfo[playerID];
  if (!playerInfo) return 0;

  const kingdomName = playerInfo.kingdomName;
  const kingdomIndex = kingdomToNumberMap[kingdomName];

  // Is this player's own prelate already influenced by someone else?
  const isInfluenced =
    G.boardState.influencePrelates[
      kingdomIndex as keyof typeof G.boardState.influencePrelates
    ] !== undefined;

  // Which kingdoms has this player influenced?
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
    votes += playerInfo.cathedrals;
  }

  // Cathedrals from influenced player kingdoms
  Object.values(G.playerInfo).forEach((kingdom) => {
    if (kingdomsUnderOurInfluence.includes(kingdom.kingdomName)) {
      if (!G.eventState.schismAffected.includes(kingdom.id)) {
        votes += kingdom.cathedrals;
      }
    }
  });

  kingdomsUnderOurInfluence.forEach((kName) => {
    const nprVotes = G.nprCathedrals[kName];
    if (nprVotes !== undefined) {
      votes += nprVotes;
    }
  });

  if (kingdomsUnderOurInfluence.includes("Venoa")) votes += 1;
  if (kingdomsUnderOurInfluence.includes("Zeeland")) votes += 1;

  if (playerInfo.resources.advantageCard === "patriarch_of_the_church") {
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

  return votes;
}

const vote: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const voteTarget: string = args[0];
    if (!ctx.playOrder.includes(voteTarget)) return INVALID_MOVE;
    if (G.hasVoted.includes(playerID)) {
      // Already voted — skip to next player instead of stalling
      events.endTurn();
      return;
    }

    // Store the ballot — hidden from other players until all have voted
    G.voteSubmitted[playerID] = voteTarget;
    G.hasVoted.push(playerID);

    // Only tally and resolve once every player has submitted their vote
    if (G.hasVoted.length === ctx.playOrder.length) {
      // Tally: each voter contributes their vote power to their chosen target
      for (const [pid, target] of Object.entries(G.voteSubmitted)) {
        const votes = calculateVotePower(G, pid);

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
        let incumbentId: string | undefined;
        Object.values(G.playerInfo).forEach((player) => {
          if (player.isArchprelate) {
            incumbentId = player.id;
          }
        });
        finalWinner = incumbentId ?? winners[0];
      } else {
        finalWinner = winners[0];
      }

      // Track who was Archprelate before this election (for fatigue)
      let previousArchprelateId: string | undefined;
      Object.values(G.playerInfo).forEach((player) => {
        if (player.isArchprelate) previousArchprelateId = player.id;
      });

      Object.values(G.playerInfo).forEach((player) => {
        if (player.id === finalWinner) {
          player.isArchprelate = true;
          // Elected Archprelate's heresy marker retreats one space
          if (player.heresyTracker > HERESY_MIN) {
            player.heresyTracker -= 1;
          }
          const orthodoxRealms = countOrthodoxRealms(G);

          // Archprelate Fatigue: consecutive wins reduce VP
          if (player.id === previousArchprelateId) {
            G.consecutiveArchprelateWins += 1;
          } else {
            G.consecutiveArchprelateWins = 1;
          }
          const fatigueReduction = Math.max(0, (G.consecutiveArchprelateWins - 1) * 2);

          // Rule: floor(2 × orthodoxRealms / 3), maximum 6 VP, minus fatigue
          const baseVP = Math.min(6, Math.floor((2 * orthodoxRealms) / 3));
          const electionVP = Math.max(0, baseVP - fatigueReduction);
          player.resources.victoryPoints += electionVP;
          if (fatigueReduction > 0) {
            logEvent(G, `Archprelate elected: ${player.kingdomName} (+${electionVP} VP, fatigue −${fatigueReduction})`);
          } else {
            logEvent(G, `Archprelate elected: ${player.kingdomName} (+${electionVP} VP)`);
          }
        } else {
          player.isArchprelate = false;
        }
      });

      // Election complete — advance to the post-election phase
      events.endPhase();
    } else {
      // Sequential voting — advance to next player
      events.endTurn();
    }
  },
  errorMessage: "Cannot cast vote right now",
};

export default vote;
