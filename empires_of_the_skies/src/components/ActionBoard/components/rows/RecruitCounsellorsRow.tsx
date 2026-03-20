import { ActionBoardProps } from "../shared";
import { RECRUIT_COUNSELLORS } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_RECRUIT_COUNSELLORS } from "@eots/game";

const RecruitCounsellorsRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Recruit Counsellors"
    cost="1g + row count → +1 counsellor"
    images={RECRUIT_COUNSELLORS}
    totalSlots={SLOTS_RECRUIT_COUNSELLORS}
    slotState={props.G.boardState.recruitCounsellors}
    onPlace={(slot) => { clearMoves(props); props.moves.recruitCounsellors(slot); }}
    playerInfo={props.G.playerInfo}
    accent="#6b7280"
  />
);

export default RecruitCounsellorsRow;
