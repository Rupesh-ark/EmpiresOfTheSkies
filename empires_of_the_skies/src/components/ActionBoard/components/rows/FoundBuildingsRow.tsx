import { ActionBoardButtonLarge } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { FOUND_BUILDINGS } from "@/assets/actionBoard";

const FoundBuildingsRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Found Buildings"
        meta={[
          {
            label: "Costs",
            value: "Cathedral 5g, Palace 5g, Shipyard 3g, Fort 2g",
          },
          { label: "Modifier", value: "+ row count cost" },
        ]}
        badges={["Cathedral: Orthodox only"]}
        accent="#2f9a68"
      />
    }
  >
    {FOUND_BUILDINGS.map((image, i) => (
      <ActionBoardButtonLarge
        key={`found-building-${i}`}
        value={i}
        onClickFunction={props.moves.foundBuildings}
        backgroundImage={image}
        width="180px"
        counsellors={
          props.G.boardState.foundBuildings[
            (i + 1) as keyof typeof props.G.boardState.foundBuildings
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export default FoundBuildingsRow;
