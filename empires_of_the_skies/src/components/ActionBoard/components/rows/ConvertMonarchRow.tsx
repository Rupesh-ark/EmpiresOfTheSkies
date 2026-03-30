import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { CONVERT_MONARCH } from "@/assets/actionBoard";

const BG_COLOR = "#9EE8FF";

const ConvertMonarchRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Convert Monarch"
        meta={[
          { label: "Cost", value: "2g + 1 counsellor" },
          { label: "Effect", value: "Flip alignment, release prisoners" },
        ]}
        accent="#1e6091"
      />
    }
  >
    {CONVERT_MONARCH.map((image, i) => (
      <ActionBoardButton
        key={`convert-monarch-${i}`}
        value={i}
        onClickFunction={props.moves.convertMonarch}
        backgroundImage={image}
        backgroundColour={BG_COLOR}
        width="52px"
        counsellor={
          props.G.boardState.convertMonarch[
            (i + 1) as keyof typeof props.G.boardState.convertMonarch
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default ConvertMonarchRow;
