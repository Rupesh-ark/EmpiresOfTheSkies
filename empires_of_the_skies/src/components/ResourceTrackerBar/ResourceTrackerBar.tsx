import { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  AppBar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { IoMdCube } from "react-icons/io";
import { GiTrumpetFlag } from "react-icons/gi";
import {
  checkPlayerIDAndReturnPlayerInfo,
  clearMoves,
} from "@eots/game";
import { Person4Sharp } from "@mui/icons-material";
import ArchprelateIcon from "../Icons/ArchprelateIcon";
import CounsellorIcon from "../Icons/CounsellorIcon";
import SkyshipIcon from "../Icons/SkyshipIcon";
import RegimentIcon from "../Icons/RegimentIcon";
import LevyIcon from "../Icons/LevyIcon";
import VictoryPointIcon from "../Icons/VictoryPointIcon";

const chipSx = {
  backgroundColor: "rgba(0,0,0,0.35)",
  color: "white",
  height: 36,
  "& .MuiChip-icon": { fontSize: 26 },
};

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
      <Toolbar sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, py: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Tooltip title="Current Phase" disableInteractive>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <GiTrumpetFlag style={{ fontSize: "28px" }} />
              <span style={{ textTransform: "capitalize" }}>{props.G.stage}</span>
            </span>
          </Tooltip>
          <Tooltip title="Kingdom to Play" disableInteractive>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Person4Sharp
                sx={{ color: props.G.playerInfo[props.ctx.currentPlayer].colour }}
              />
              {props.G.playerInfo[props.ctx.currentPlayer].kingdomName}
            </span>
          </Tooltip>
          {props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
            .isArchprelate && (
            <Tooltip title="Archprelate" disableInteractive>
              <span style={{ display: "flex", alignItems: "center" }}>
                <ArchprelateIcon />
              </span>
            </Tooltip>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <Tooltip title="Counsellors" disableInteractive>
            <Chip
              icon={<CounsellorIcon colour={colour ?? "white"} />}
              label={counsellors}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Gold" disableInteractive>
            <Chip
              icon={<IoMdCube style={{ color: "#FFD700" }} />}
              label={gold}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Skyships" disableInteractive>
            <Chip
              icon={<SkyshipIcon colour={colour} />}
              label={skyships}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Regiments" disableInteractive>
            <Chip
              icon={<RegimentIcon colour={colour} />}
              label={regiments}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Levies" disableInteractive>
            <Chip
              icon={<LevyIcon colour={colour} />}
              label={levies}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Victory Points" disableInteractive>
            <Chip
              icon={<VictoryPointIcon colour={colour} />}
              label={victoryPoints}
              sx={chipSx}
            />
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => clearMoves(props)}
          >
            Clear Move
          </Button>
          {turnComplete ? (
            <Button
              size="small"
              disabled={!turnComplete}
              variant="contained"
              color="success"
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
              size="small"
              variant="contained"
              color="warning"
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
