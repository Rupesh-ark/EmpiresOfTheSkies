import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_CONVERT_MONARCH } from "@eots/game";

const ConvertMonarchRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Convert Monarch"
    cost=""
    actionId="convert-monarch"
    images={[]}
    totalSlots={SLOTS_CONVERT_MONARCH}
    slotState={props.G.boardState.convertMonarch}
    onPlace={(slot) => { clearMoves(props); props.moves.convertMonarch(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#1e6091"
    bgImage={BTN_BG.convertMonarch}
  />
);

export default ConvertMonarchRow;
