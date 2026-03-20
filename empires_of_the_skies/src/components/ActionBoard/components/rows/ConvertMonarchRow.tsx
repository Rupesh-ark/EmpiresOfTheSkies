import { ActionBoardProps } from "../shared";
import { CONVERT_MONARCH } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_CONVERT_MONARCH } from "@eots/game";

const ConvertMonarchRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Convert Monarch"
    cost="2g + 1 counsellor → flip alignment"
    images={CONVERT_MONARCH}
    totalSlots={SLOTS_CONVERT_MONARCH}
    slotState={props.G.boardState.convertMonarch}
    onPlace={(slot) => { clearMoves(props); props.moves.convertMonarch(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#1e6091"
  />
);

export default ConvertMonarchRow;
