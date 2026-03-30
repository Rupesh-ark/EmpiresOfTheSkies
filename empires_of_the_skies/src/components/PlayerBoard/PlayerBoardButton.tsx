import React from "react";
import { MyGameProps, PlayerColour } from "@eots/game";
import { Button } from "@mui/material";
import { clearMoves } from "@/utils/gameHelpers";
import CounsellorIcon from "../Icons/CounsellorIcon";

export const PlayerBoardButton = (props: PlayerBoardButtonProps) => {
  return (
    <Button
      sx={{
        width: props.width ? props.width : "98px",
        height: props.height ? props.height : "50px",
        backgroundImage: `url(${props.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontSize: "18px",
        backgroundColor: props.colour,
        borderRadius: "12px",
        border: "1px solid rgba(15,23,42,0.22)",
        boxShadow: "0 4px 10px rgba(15,23,42,0.14)",
        overflow: "hidden",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 8px 16px rgba(15,23,42,0.2)",
        },
        "&.Mui-disabled": {
          borderColor: "rgba(15,23,42,0.14)",
          boxShadow: "none",
          filter: "saturate(0.72)",
        },
      }}
      disabled={props.disabled}
      onClick={() => {
        clearMoves(props);
        props.onClick();
      }}
    >
      {props.text}
      {props.counsellor ? <CounsellorIcon colour={props.colour} /> : null}
    </Button>
  );
};

interface PlayerBoardButtonProps extends MyGameProps {
  onClick: () => void;
  colour: (typeof PlayerColour)[keyof typeof PlayerColour];
  counsellor?: boolean;
  backgroundImage?: string;
  text?: string;
  disabled?: boolean;
  width?: string;
  height?: string;
}
