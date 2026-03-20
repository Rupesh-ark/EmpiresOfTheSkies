import { ActionBoardProps } from "../shared";
import { RECRUIT_REGIMENTS } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_RECRUIT_REGIMENTS } from "@eots/game";

const RecruitRegimentsRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Recruit Regiments"
    cost="1g + row count → +4 regiments"
    images={RECRUIT_REGIMENTS}
    totalSlots={SLOTS_RECRUIT_REGIMENTS}
    slotState={props.G.boardState.recruitRegiments}
    onPlace={(slot) => { clearMoves(props); props.moves.recruitRegiments(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#4b5563"
  />
);

export default RecruitRegimentsRow;
