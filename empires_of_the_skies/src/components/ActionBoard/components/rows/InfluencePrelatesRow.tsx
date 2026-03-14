import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { ThemeProvider } from "@emotion/react";
import { influencePrelatesTheme } from "@/components/themes";
import { PlayerColour } from "@eots/game";

const KINGDOMS = [
  { name: "Angland",     color: PlayerColour.red },
  { name: "Gallois",     color: PlayerColour.blue },
  { name: "Castillia",   color: PlayerColour.yellow },
  { name: "Zeeland",     color: "#FE9F10" },
  { name: "Venoa",       color: "#FE9ACC" },
  { name: "Nordmark",    color: PlayerColour.brown },
  { name: "Ostreich",    color: PlayerColour.white },
  { name: "Constantium", color: PlayerColour.green },
];

const InfluencePrelatesRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Influence Prelates"
        meta={[
          { label: "Own Slot", value: "Free" },
          { label: "Realm Slot", value: "1g" },
          { label: "Rival Slot", value: "Pay cathedral count in gold" },
        ]}
        accent="#6f7f8e"
      />
    }
  >
    <ThemeProvider theme={influencePrelatesTheme}>
      {KINGDOMS.map((kingdom, i) => (
        <ActionBoardButton
          key={`prelate-${i}`}
          value={i}
          onClickFunction={props.moves.influencePrelates}
          backgroundColour={kingdom.color}
          text={kingdom.name}
          width="10px"
          counsellor={
            props.G.boardState.influencePrelates[
              (i + 1) as keyof typeof props.G.boardState.influencePrelates
            ]
          }
          requires={{ gold: true }}
          {...props}
        />
      ))}
    </ThemeProvider>
  </ActionRow>
);

export default InfluencePrelatesRow;
