import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { PUNISH_DISSENTERS } from "@/assets/actionBoard";

const PunishDissentersRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Punish Dissenters"
        meta={[
          { label: "Cost", value: "2g or 1 counsellor" },
          { label: "Effect", value: "Imprison or execute" },
        ]}
        accent="#7f1d1d"
      />
    }
  >
    {PUNISH_DISSENTERS.map((image, i) => (
      <ActionBoardButton
        key={`punish-dissenter-${i}`}
        value={i}
        onClickFunction={props.moves.punishDissenters}
        backgroundImage={image}
        width="52px"
        counsellor={
          props.G.boardState.punishDissenters[
            (i + 1) as keyof typeof props.G.boardState.punishDissenters
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default PunishDissentersRow;
