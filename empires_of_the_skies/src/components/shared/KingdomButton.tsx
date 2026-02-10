import { Button } from "@mui/material";
import React from "react";
import { MyGameProps } from "../../types";

export const KingdomButton = (props: KingdomButtonProps) => {
  const colourToKingdomMap = {
    "#DC5454": "Angland",
    "#51658D": "Gallois",
    "#F5DE48": "Castillia",
    // "#FE9F10":"Zeeland",
    // "#FE9ACC":"Venoa",
    "#A0522D": "Nordmark",
    "#E6EFE9": "Ostreich",
    "#478779": "Constantium",
  };

  return (
    <Button
      key={props.id}
      style={{
        backgroundColor: props.G.playerInfo[props.id].colour,
        border: props.id === props.selectedKingdom ? "2px solid black" : "none",
        color: "#000000",
      }}
      onClick={() => {
        props.setSelectedKingdom(props.id);
      }}
    >
      {colourToKingdomMap[props.G.playerInfo[props.id].colour]}
    </Button>
  );
};
interface KingdomButtonProps extends MyGameProps {
  selectedKingdom: string;
  setSelectedKingdom: React.Dispatch<React.SetStateAction<string>>;
  id: string;
}
