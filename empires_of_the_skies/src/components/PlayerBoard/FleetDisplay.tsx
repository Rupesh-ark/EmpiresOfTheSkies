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
      <Typography
        sx={{
          fontFamily: fonts.system,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(19,38,58,0.62)",
        }}
      >
        Current Position
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.55, flexWrap: "wrap" }}>
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "0.88rem",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#13263a",
          }}
        >
          {props.locationLabel}
        </Typography>
        <Box
          component="span"
          sx={{
            px: 0.6,
            py: 0.15,
            borderRadius: 999,
            backgroundColor: "rgba(19,38,58,0.08)",
            border: "1px solid rgba(19,38,58,0.15)",
            fontFamily: fonts.system,
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "rgba(19,38,58,0.72)",
          }}
        >
          {props.locationReference}
        </Box>
      </Box>
      <Box
        sx={{
          fontFamily: fonts.system,
          fontSize: "0.84rem",
          lineHeight: 1.3,
          color: "rgba(0,0,0,0.76)",
        }}
      >
        <div>{`Skyships: ${props.skyships}`}</div>
        <div>{`Regiments: ${props.regiments}`}</div>
        <div>{`Levies: ${props.levies}`}</div>
      </Box>
    </Button>
  );
};

export default FleetDisplay;

interface FleetDisplayProps extends FleetInfo {
  locationLabel: string;
  locationReference: string;
  onClickFunction: (fleetId: number) => void;
  selected: number;
}
