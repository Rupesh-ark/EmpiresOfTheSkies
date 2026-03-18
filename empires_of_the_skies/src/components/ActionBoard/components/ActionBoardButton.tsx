import { ReactElement, useState } from "react";
import { fonts } from "@/designTokens";
import { MyGameProps, PlayerColour, createLogger } from "@eots/game";

const log = createLogger("ui");
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WorldMap from "@/components/WorldMap/WorldMap";
import { clearMoves } from "@/utils/gameHelpers";
import CounsellorIcon from "@/components/Icons/CounsellorIcon";

/**
 * Check if a button's resource requirements are blocked by active restrictions.
 * Add new restriction checks here — they apply to all buttons that declare
 * the matching requirement.
 */
const isButtonRestricted = (props: ActionBoardButtonProps): boolean => {
  if (!props.requires || !props.playerID) return false;
  const player = props.G.playerInfo[props.playerID];
  if (!player) return false;

  // Lenders Refuse Credit: blocks gold-spending actions
  if (
    props.requires.gold &&
    props.G.eventState.lendersRefuseCredit.includes(props.playerID) &&
    player.resources.gold < 0
  ) return true;

  // Future resource restrictions go here

  return false;
};

export const ActionBoardButton = (props: ActionBoardButtonProps) => {
  let counsellorColour: string | undefined;

  if (props.counsellor) {
    counsellorColour = props.G.playerInfo[props.counsellor].colour;
  }
  const restricted = isButtonRestricted(props);
  return (
    <Button
      sx={{
        minWidth: props.width ? props.width : "98px",
        height: "50px",
        textAlign: "left",
        backgroundImage: `url(${props.backgroundImage})`,
        // replace background size with 'contain' to display entire image
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontSize: "18px",
        color: "black",
        textTransform: "none",
        backgroundColor: props.backgroundColour
          ? props.backgroundColour
          : "#e0e0e0",
        overflow: "hidden",
      }}
      disabled={props.disabled || restricted}
      onClick={() => {
        clearMoves(props);
        props.onClickFunction(props.value);
      }}
      value={props.value}
    >
      {props.text}

      {props.counsellor ? (
        <Box
          width={"100%"}
          height={"100%"}
          justifyContent={"flex-end"}
          display={"flex"}
        >
          <CounsellorIcon
            colour={counsellorColour ? counsellorColour : PlayerColour.blue}
          />
        </Box>
      ) : null}
    </Button>
  );
};

export const ActionBoardButtonLarge = (props: ActionBoardButtonProps) => {
  const [worldMapDialogOpen, setWorldMapDialogOpen] = useState(false);
  const [heresyOrOrthodoxyDialogOpen, setHeresyOrOrthodoxyDialogOpen] =
    useState(false);

  const [selectedTile, setSelectedTile] = useState([4, 0]);
  const restricted = isButtonRestricted(props);

  let listOfCounsellors: ReactElement[] = [];
  if (props.counsellors) {
    props.counsellors.forEach((counsellor, i) => {
      let counsellorColour = props.G.playerInfo[counsellor].colour;
      listOfCounsellors.push(
        <CounsellorIcon key={`c-${i}`} colour={counsellorColour} />
      );
    });
  }

  const alternateOnClickFunction = (coords: number[]) => {
    setSelectedTile(coords);
  };

  let possibleFortTiles: number[][] = [];
  props.G.mapState.buildings.forEach((tileRow, yIndex) => {
    tileRow.forEach((tile, xIndex) => {
      if (
        tile.player?.id === props.playerID &&
        tile.buildings &&
        (tile.garrisonedRegiments > 0 || tile.garrisonedLevies > 0) &&
        !tile.fort
      ) {
        possibleFortTiles.push([xIndex, yIndex]);
      }
    });
  });

  return (
    <>
      <Button
        sx={{
          backgroundColor: "#5ebf85",
          width: props.width ? props.width : "180px",
          height: "150px",
          textAlign: "left",
          display: "flex",
          flexWrap: "wrap",
          flexDirection: "column",
          backgroundImage: `url(${props.backgroundImage})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          fontFamily: fonts.primary,
          fontSize: "18px",
          cursor: restricted ? "not-allowed" : "pointer",
          justifyContent: "center",
          opacity: restricted ? 0.5 : 1,
        }}
        disabled={props.disabled || restricted}
        onClick={() => {
          clearMoves(props);
          // Palace (value=1): open dialog first, move fires after direction is chosen
          if (props.value !== 1) {
            props.onClickFunction(props.value);
          }
          log.debug("button click", { value: props.value });
          if (props.value === 1) {
            setHeresyOrOrthodoxyDialogOpen(true);
          }
          if (props.value === 3) {
            setWorldMapDialogOpen(true);
          }
        }}
        value={props.value}
      >
        {props.text}
        {props.counsellors ? listOfCounsellors : null}
      </Button>
      <Dialog
        maxWidth={false}
        open={heresyOrOrthodoxyDialogOpen || worldMapDialogOpen}
      >
        <DialogTitle sx={{ fontFamily: fonts.primary }}>
          {props.value === 1
            ? "Select direction to move heresy tracker"
            : `Select location for your fort. Current selection: [${
                selectedTile[0] + 1
              }, ${4 - selectedTile[1]}]`}
        </DialogTitle>
        <DialogContent>
          {props.value === 1 ? (
            <DialogContentText
              sx={{
                fontFamily: fonts.primary,
                color: "black",
              }}
            >
              The direction you pick will advance your heresy tracker by 1 in
              your chosen direction, this affects the victory points you will
              earn at the end of the game.
            </DialogContentText>
          ) : (
            <WorldMap
              {...props}
              alternateOnClick={alternateOnClickFunction}
              selectableTiles={possibleFortTiles}
            />
          )}
        </DialogContent>
        <DialogActions>
          <>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                clearMoves(props);
                setWorldMapDialogOpen(false);
                setHeresyOrOrthodoxyDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            {props.value === 1 ? (
              <>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#E77B00",
                  }}
                  onClick={() => {
                    props.moves.foundBuildings(1, "advance");
                    setHeresyOrOrthodoxyDialogOpen(false);
                  }}
                >
                  Heresy
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: "#A74383" }}
                  onClick={() => {
                    props.moves.foundBuildings(1, "retreat");
                    setHeresyOrOrthodoxyDialogOpen(false);
                  }}
                >
                  Orthodoxy
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="success"
                disabled={selectedTile[0] === 4 && selectedTile[1] === 0}
                onClick={() => {
                  props.moves.checkAndPlaceFort(selectedTile);

                  setWorldMapDialogOpen(false);
                }}
              >
                Confirm
              </Button>
            )}
          </>
        </DialogActions>
      </Dialog>
    </>
  );
};

export interface ActionBoardButtonProps extends MyGameProps {
  onClickFunction: (value: number) => void;
  value: number;
  counsellor?: string | undefined;
  counsellors?: string[] | undefined;
  backgroundImage?: string;
  text?: string;
  width?: string;
  backgroundColour?: string;
  disabled?: boolean;
  /** Declare what resources this action requires — auto-disables if restricted */
  requires?: { gold?: boolean; counsellor?: boolean };
}
