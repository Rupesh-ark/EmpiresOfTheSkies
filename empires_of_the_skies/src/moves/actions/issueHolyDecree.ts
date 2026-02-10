import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import {
  addVPAmount,
  advanceAllHeresyTrackers,
  removeVPAmount,
  retreatAllHeresyTrackers,
} from "../resourceUpdates";
import { INVALID_MOVE } from "boardgame.io/core";
import { blessingOrCurseVPAmount } from "../../helpers/helpers";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const issueHolyDecree: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: RandomAPI;
  },
  ...args: any[]
) => {
  const value = args[0];
  const id = args[1];
  if (!G.playerInfo[playerID].isArchprelate) {
    console.log(
      "One who has not been anointed by God has attempted to issue a holy decree."
    );
    return INVALID_MOVE;
  }
  if (G.boardState.issueHolyDecree) {
    console.log(
      "You must prove your worthiness by re-election before issuing another holy decree."
    );
    return INVALID_MOVE;
  }

  switch (value) {
    case "reform dogma":
      retreatAllHeresyTrackers(G);
      break;
    case "confirm dogma":
      advanceAllHeresyTrackers(G);
      break;

    case "curse monarch":
      removeVPAmount(G, id, blessingOrCurseVPAmount(G));
      break;
    case "bless monarch":
      addVPAmount(G, id, blessingOrCurseVPAmount(G));
      break;
  }

  G.boardState.issueHolyDecree = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default issueHolyDecree;
