import React from "react";
import { FleetInfo } from "@eots/game";
import { Box, Button, Typography } from "@mui/material";
import { fonts } from "../../designTokens";

const FleetDisplay = (props: FleetDisplayProps) => {
  const isSelected = props.selected === props.fleetId;
  return (
    <Button
      sx={{
        p: 1.2,
        minWidth: "190px",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.35,
        borderRadius: "12px",
        border: isSelected
          ? "2px solid rgba(41,121,255,0.85)"
          : "1px solid rgba(15,23,42,0.2)",
        color: "#13263a",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.96) 100%)",
        boxShadow: isSelected
          ? "0 10px 18px rgba(34,94,168,0.2)"
          : "0 4px 10px rgba(15,23,42,0.08)",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 10px 18px rgba(15,23,42,0.16)",
        },
      }}
      onClick={() => props.onClickFunction(props.fleetId)}
    >
      <Typography
        sx={{ fontFamily: fonts.system, fontWeight: 800, fontSize: "0.95rem" }}
      >
        {`Fleet ${props.fleetId + 1}`}
      </Typography>
      <Box
        sx={{
          fontFamily: fonts.system,
          fontSize: "0.84rem",
          lineHeight: 1.3,
          color: "rgba(0,0,0,0.76)",
        }}
      >
        <div>{`Location: [${props.location[0] + 1}, ${4 - props.location[1]}]`}</div>
        <div>{`Skyships: ${props.skyships}`}</div>
        <div>{`Regiments: ${props.regiments}`}</div>
        <div>{`Levies: ${props.levies}`}</div>
      </Box>
    </Button>
  );
};

export default FleetDisplay;

interface FleetDisplayProps extends FleetInfo {
  onClickFunction: (fleetId: number) => void;
  selected: number;
}
