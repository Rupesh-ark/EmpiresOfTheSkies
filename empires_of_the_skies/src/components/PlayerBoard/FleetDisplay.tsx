import React from "react";
import { FleetInfo } from "@eots/game";
import { Button, Stack } from "@mui/material";

const FleetDisplay = (props: FleetDisplayProps) => {
  return (
    <Button
      variant="contained"
      sx={{
        marginRight: "10px",
        border:
          props.selected === props.fleetId ? "5px solid black" : undefined,
      }}
      color={props.selected === props.fleetId ? "success" : "primary"}
      onClick={() => props.onClickFunction(props.fleetId)}
    >
      <Stack spacing={"xs"}>
        <p>{`Fleet: ${props.fleetId + 1}`}</p>
        <p>{`Location: [${props.location[0] + 1}, ${
          4 - props.location[1]
        }]`}</p>
        <p>{`Skyships: ${props.skyships}`}</p>
        <p>{`Regiments: ${props.regiments}`}</p>
        <p>{`Levies: ${props.levies}`}</p>
      </Stack>
    </Button>
  );
};

export default FleetDisplay;

interface FleetDisplayProps extends FleetInfo {
  onClickFunction: (fleetId: number) => void;
  selected: number;
}
