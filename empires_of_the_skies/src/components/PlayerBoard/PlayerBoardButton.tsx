import React from "react";
import { MyGameProps, PlayerColour } from "@eots/game";
import { Button } from "@mui/material";
import { clearMoves } from "@eots/game";
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
