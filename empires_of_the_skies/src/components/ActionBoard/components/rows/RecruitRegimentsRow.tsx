import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { RECRUIT_REGIMENTS } from "@/assets/actionBoard";

const RecruitRegimentsRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Recruit Regiments"
        meta={[
          { label: "Cost", value: "1g + row count" },
          { label: "Gain", value: "+4 regiments in kingdom" },
          { label: "Max", value: "30" },
        ]}
        accent="#4b5563"
      />
    }
  >
    {RECRUIT_REGIMENTS.map((image, i) => (
      <ActionBoardButton
        key={`recruit-regiment-${i}`}
        value={i}
        onClickFunction={props.moves.recruitRegiments}
        backgroundImage={image}
        width="98px"
        counsellor={
          props.G.boardState.recruitRegiments[
            (i + 1) as keyof typeof props.G.boardState.recruitRegiments
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default RecruitRegimentsRow;
