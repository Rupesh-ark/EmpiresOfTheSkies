import { ActionBoardProps } from "../shared";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_FOUND_FACTORIES } from "@eots/game";

const FoundFactoriesRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Found Factories"
    cost="1g + row count → +1 factory"
    images={[]}
    totalSlots={SLOTS_FOUND_FACTORIES}
    slotState={props.G.boardState.foundFactories}
    onPlace={(slot) => { clearMoves(props); props.moves.foundFactory(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#8f6f34"
  />
);

export default FoundFactoriesRow;
