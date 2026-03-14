import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { PLAYER_ORDER } from "@/assets/actionBoard";

const LABELS = ["1st\t", "2nd\t", "3rd\t", "4th\t", "5th\t", "6th\t"];
const BG_COLOR = "#9EE8FF";

const PlayerOrderRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Change Player Order"
        meta={[
          { label: "Cost", value: "1 counsellor" },
          { label: "Effect", value: "takes effect at Reset" },
        ]}
        accent="#2a7fa5"
      />
    }
  >
    {PLAYER_ORDER.map((image, i) => (
      <ActionBoardButton
        key={`player-order-${i}`}
        value={i}
        onClickFunction={props.moves.alterPlayerOrder}
        backgroundImage={image}
        backgroundColour={BG_COLOR}
        text={LABELS[i]}
        width="98px"
        counsellor={
          props.G.boardState.pendingPlayerOrder[
            (i + 1) as keyof typeof props.G.boardState.pendingPlayerOrder
          ]
        }
        {...props}
      />
    ))}
  </ActionRow>
);

export default PlayerOrderRow;
