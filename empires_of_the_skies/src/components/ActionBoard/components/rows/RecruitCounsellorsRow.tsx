import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { RECRUIT_COUNSELLORS } from "@/assets/actionBoard";

const RecruitCounsellorsRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Recruit Counsellors"
        meta={[
          { label: "Cost", value: "1g + row count" },
          { label: "Gain", value: "+1 counsellor" },
          { label: "Max", value: "7" },
        ]}
        accent="#6b7280"
      />
    }
  >
    {RECRUIT_COUNSELLORS.map((image, i) => (
      <ActionBoardButton
        key={`recruit-counsellor-${i}`}
        value={i}
        onClickFunction={props.moves.recruitCounsellors}
        backgroundImage={image}
        width="98px"
        counsellor={
          props.G.boardState.recruitCounsellors[
            (i + 1) as keyof typeof props.G.boardState.recruitCounsellors
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default RecruitCounsellorsRow;
