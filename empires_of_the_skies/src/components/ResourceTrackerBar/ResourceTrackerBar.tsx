import React, { useState } from "react";
import { MyGameProps } from "../../types";
import {
  AppBar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ThemeProvider,
  Toolbar,
  Tooltip,
} from "@mui/material";
import GoldIcon from "../../boards_and_assets/gold_icon.svg";
import { generalTheme } from "../themes";
import {
  checkPlayerIDAndReturnPlayerInfo,
  clearMoves,
} from "../../helpers/helpers";
import { Person4Sharp } from "@mui/icons-material";
import ArchprelateIcon from "../Icons/ArchprelateIcon";

const ResourceTrackerBar = (props: ResourceTrackerBarProps) => {
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  if (!props.playerID) {
    return <></>;
  }
  const currentPlayer = checkPlayerIDAndReturnPlayerInfo(props);
  const counsellors = currentPlayer.resources.counsellors;
  const gold = currentPlayer.resources.gold;
  const skyships = currentPlayer.resources.skyships;
  const regiments = currentPlayer.resources.regiments;
  const colour = currentPlayer.colour;
  const victoryPoints = currentPlayer.resources.victoryPoints;
  const levies = currentPlayer.resources.levies;
  const turnComplete =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer].turnComplete;

  const endTurn = () => {
    if (props.events.endTurn) {
      if (props.ctx.numMoves) {
        if (props.ctx.numMoves > 0) {
          props.events.endTurn();
        }
      }
    }
  };
  return (
    <AppBar position={"sticky"}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <div style={{ justifyContent: "left" }}>
          {`Phase: ${props.G.stage} \t`}
        </div>

        {"Kingdom to play:   "}
        <Person4Sharp
          sx={{
            color: props.G.playerInfo[props.ctx.currentPlayer].colour,
          }}
        ></Person4Sharp>
        {props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
          .isArchprelate && (
          <div style={{ alignItems: "center", justifyContent: "center" }}>
            <ArchprelateIcon />
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginLeft: "auto",
            marginRight: 0,
          }}
        >
          <Tooltip title="Counsellors">
            <svg
              width="35"
              height="33"
              viewBox="0 0 35 33"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M444.447 -33.4065V244.156H-287.589V-33.4065H444.447Z"
                stroke="#1A1A18"
                strokeWidth="2.6664"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.9062 25.5842C27.4438 25.5842 35.1753 27.1947 35.1753 29.1819C35.1753 31.1689 27.4438 32.7797 17.9062 32.7797C8.36817 32.7797 0.636719 31.1689 0.636719 29.1819C0.636719 27.1947 8.36817 25.5842 17.9062 25.5842Z"
                fill={colour ?? "white"}
              />
              <path
                d="M17.9062 25.5842C27.4438 25.5842 35.1753 27.1947 35.1753 29.1819C35.1753 31.1689 27.4438 32.7797 17.9062 32.7797C8.36817 32.7797 0.636719 31.1689 0.636719 29.1819C0.636719 27.1947 8.36817 25.5842 17.9062 25.5842Z"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.276855 4.55806H34.8731V29.901H0.276855V4.55806Z"
                fill={colour}
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.5755 0.78304C27.1135 0.78304 34.8448 2.39344 34.8448 4.38078C34.8448 6.36758 27.1135 7.97852 17.5755 7.97852C8.03775 7.97852 0.306396 6.36758 0.306396 4.38078C0.306396 2.39344 8.03775 0.78304 17.5755 0.78304Z"
                fill={colour}
              />
              <path
                d="M17.5755 0.78304C27.1135 0.78304 34.8448 2.39344 34.8448 4.38078C34.8448 6.36758 27.1135 7.97852 17.5755 7.97852C8.03775 7.97852 0.306396 6.36758 0.306396 4.38078C0.306396 2.39344 8.03775 0.78304 17.5755 0.78304Z"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
            </svg>
          </Tooltip>
          {"   " + counsellors + "\t"}
          <Tooltip title="Gold">
            <img src={GoldIcon}></img>
          </Tooltip>
          {"   " + gold + "\t"}
          <Tooltip title="Skyships">
            <svg
              width="44"
              height="17"
              viewBox="0 0 44 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M704.447 -37.4065V240.156H-27.5886V-37.4065H704.447Z"
                stroke="#1A1A18"
                strokeWidth="2.6664"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M21.8461 7.19031C33.4021 7.19031 42.7695 9.14218 42.7695 11.5496C42.7695 13.9572 33.4021 15.9086 21.8461 15.9086C10.2902 15.9086 0.922607 13.9572 0.922607 11.5496C0.922607 9.14218 10.2902 7.19031 21.8461 7.19031Z"
                fill={colour}
              />
              <path
                d="M21.8461 7.19031C33.4021 7.19031 42.7695 9.14217 42.7695 11.5496C42.7695 13.9572 33.4021 15.9086 21.8461 15.9086C10.2902 15.9086 0.922607 13.9572 0.922607 11.5496C0.922607 9.14217 10.2902 7.19031 21.8461 7.19031Z"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.486328 5.44613H42.4033V12.4204H0.486328V5.44613Z"
                fill={colour}
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M22.0358 1.32971C33.5918 1.32971 42.9592 3.28117 42.9592 5.68864C42.9592 8.09624 33.5918 10.048 22.0358 10.048C10.4799 10.048 1.1123 8.09624 1.1123 5.68864C1.1123 3.28117 10.4799 1.32971 22.0358 1.32971Z"
                fill={colour}
              />
              <path
                d="M22.0358 1.32971C33.5918 1.32971 42.9592 3.28117 42.9592 5.68864C42.9592 8.09624 33.5918 10.048 22.0358 10.048C10.4799 10.048 1.1123 8.09624 1.1123 5.68864C1.1123 3.28117 10.4799 1.32971 22.0358 1.32971Z"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
            </svg>
          </Tooltip>{" "}
          {"   " + skyships + "\t"}
          <Tooltip title="Regiments">
            <svg
              width="28"
              height="31"
              viewBox="0 0 28 31"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
                fill={colour}
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
                fill={colour}
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
                fill={colour}
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
            </svg>
          </Tooltip>
          {"   " + regiments + "\t"}
          <Tooltip title="Levies">
            <svg
              width="28"
              height="31"
              viewBox="0 0 28 31"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
                fill="#B1B2B2"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
                fill="#B1B2B2"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
              <path
                d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
                fill="#B1B2B2"
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
            </svg>
          </Tooltip>
          {"   " + levies + "\t"}
          <Tooltip title="Victory Points">
            <svg
              width="29"
              height="31"
              viewBox="0 0 29 31"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.6062 1.50915L11.3822 12.9416L0.766357 12.3625L9.84318 19.2049L6.05273 29.9237L14.8866 22.7202L23.1597 29.9237L19.5426 18.6293L28.446 12.3625L17.3766 12.5858L14.6062 1.50915Z"
                fill={colour}
                stroke="#1A1A18"
                strokeWidth="0.288"
                strokeMiterlimit="22.9256"
              />
            </svg>
          </Tooltip>
          {"   " + victoryPoints + "\t"}
          <Button
            variant="contained"
            color="error"
            onClick={() => clearMoves(props)}
          >
            Clear Move
          </Button>
          {turnComplete ? (
            <Button
              disabled={!turnComplete}
              variant="contained"
              color="success"
              sx={{ marginLeft: "10px" }}
              onClick={() => {
                if (props.ctx.numMoves !== undefined) {
                  if (props.ctx.numMoves > 0) {
                    props.moves.flipCards();
                    props.moves.setTurnCompleteFalse();
                    endTurn();
                  }
                }
              }}
            >
              Confirm & End Turn
            </Button>
          ) : (
            <Button
              variant="contained"
              color="warning"
              sx={{ marginLeft: "10px" }}
              onClick={() => {
                setPassDialogOpen(true);
              }}
              disabled={!(props.ctx.currentPlayer === props.playerID)}
            >
              Pass
            </Button>
          )}
        </div>
      </Toolbar>
      <Dialog open={passDialogOpen}>
        <DialogTitle>Are you sure you want to pass?</DialogTitle>
        <DialogContent>
          You will not be able to make any further moves until the next phase of
          play.
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setPassDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setPassDialogOpen(false);
              props.moves.pass();
            }}
          >
            Confirm Pass
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

interface ResourceTrackerBarProps extends MyGameProps {}
export default ResourceTrackerBar;
