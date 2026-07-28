import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { logEvent } from "../../helpers/stateUtils.js";
import { beginGrandArmyBattle } from "../../helpers/resolveInvasion.js";

const contributeToGrandArmy: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    const regiments: unknown = args[0] ?? 0;
    const levies: unknown = args[1] ?? 0;
    const skyships: unknown = args[2] ?? 0;

    if (!G.currentInvasion) return INVALID_MOVE;
    if (G.currentInvasion.phase !== "contribute") return INVALID_MOVE;
    if (G.currentInvasion.contributions[playerID] !== undefined) {
      return INVALID_MOVE;
    }

    const player = G.playerInfo[playerID];

    if (
      !Number.isInteger(regiments) ||
      !Number.isInteger(levies) ||
      !Number.isInteger(skyships)
    ) {
      return INVALID_MOVE;
    }
    const regimentCount = regiments as number;
    const levyCount = levies as number;
    const skyshipCount = skyships as number;
    if (regimentCount < 0 || levyCount < 0 || skyshipCount < 0) {
      return INVALID_MOVE;
    }
    if (regimentCount > player.resources.regiments) return INVALID_MOVE;
    if (levyCount > player.resources.levies) return INVALID_MOVE;
    if (skyshipCount > player.resources.skyships) return INVALID_MOVE;

    G.currentInvasion.contributions[playerID] = {
      regiments: regimentCount,
      levies: levyCount,
      skyships: skyshipCount,
    };

    const totalSwords =
      regimentCount * 2 + levyCount + skyshipCount;
    const parts: string[] = [];
    if (regimentCount > 0) parts.push(`${regimentCount} regiments`);
    if (levyCount > 0) parts.push(`${levyCount} levies`);
    if (skyshipCount > 0) parts.push(`${skyshipCount} skyships`);
    logEvent(
      G,
      `${player.kingdomName} contributes ${parts.join(", ") || "nothing"} (${totalSwords} swords) to the Grand Army`
    );

    // Check if all players have contributed
    const allContributed = ctx.playOrder.every(
      (id) => G.currentInvasion!.contributions[id] !== undefined
    );

    if (allContributed) {
      const result = beginGrandArmyBattle(G, random.Shuffle);
      if (result.status === "awaiting_fow") {
        events.endTurn({ next: result.playerID });
      } else if (result.status === "defeat") {
        events.endTurn({ next: ctx.playOrder[0] });
      } else {
        events.endPhase();
      }
    } else {
      // Next player in IPO who hasn't contributed yet
      const nextPlayer = ctx.playOrder.find(
        (id) => G.currentInvasion!.contributions[id] === undefined
      );
      if (nextPlayer) {
        events.endTurn({ next: nextPlayer });
      }
    }
  },
  errorMessage: "Cannot contribute to the Grand Army right now",
};

export default contributeToGrandArmy;
