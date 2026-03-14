import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";

const SLOTS = [
  { text: "Slot 1" },
  { text: "Slot 2" },
  { text: "Slot 3" },
  { text: "Slot 4" },
];
const BG_COLOR = "#C8A96E";

const FoundFactoriesRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Found Factories"
        meta={[
          { label: "Cost", value: "1g + row count" },
          { label: "Gain", value: "+1 factory" },
          { label: "Max", value: "6" },
        ]}
        accent="#8f6f34"
      />
    }
  >
    {SLOTS.map((slot, i) => (
      <ActionBoardButton
        key={`found-factory-${i}`}
        value={i}
        onClickFunction={props.moves.foundFactory}
        backgroundColour={BG_COLOR}
        text={slot.text}
        width="98px"
        counsellor={
          props.G.boardState.foundFactories[
            (i + 1) as keyof typeof props.G.boardState.foundFactories
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default FoundFactoriesRow;
