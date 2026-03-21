import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_FOUND_FACTORIES } from "@eots/game";

const FoundFactoriesRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Found Factories"
    cost=""
    actionId="found-factories"
    images={[]}
    totalSlots={SLOTS_FOUND_FACTORIES}
    slotState={props.G.boardState.foundFactories}
    onPlace={(slot) => { clearMoves(props); props.moves.foundFactory(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#8f6f34"
    bgImage={BTN_BG.foundFactory}
  />
);

export default FoundFactoriesRow;
