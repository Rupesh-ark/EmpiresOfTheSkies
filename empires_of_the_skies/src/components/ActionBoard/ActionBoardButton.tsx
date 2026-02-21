import { ReactElement, useState } from "react";
import { MyGameProps, PlayerColour } from "@eots/game";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WorldMap from "../WorldMap/WorldMap";
import { clearMoves } from "@eots/game";
import CounsellorIcon from "../Icons/CounsellorIcon";

export const ActionBoardButton = (props: ActionBoardButtonProps) => {
  let counsellorColour: string | undefined;

  if (props.counsellor) {
    counsellorColour = props.G.playerInfo[props.counsellor].colour;
  }
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

  let listOfCounsellors: ReactElement[] = [];
  if (props.counsellors) {
    props.counsellors.forEach((counsellor) => {
      let counsellorColour = props.G.playerInfo[counsellor].colour;
      listOfCounsellors.push(
        <CounsellorIcon colour={counsellorColour}></CounsellorIcon>
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
          fontFamily: "dauphinn",
          fontSize: "18px",
          cursor: "pointer",
          justifyContent: "center",
        }}
        onClick={() => {
          clearMoves(props);
          props.onClickFunction(props.value);
          console.log(props.value);
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
        <DialogTitle sx={{ fontFamily: "dauphinn" }}>
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
                fontFamily: "dauphinn",
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
                    props.moves.increaseHeresy();
                    setHeresyOrOrthodoxyDialogOpen(false);
                  }}
                >
                  Heresy
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: "#A74383" }}
                  onClick={() => {
                    props.moves.increaseOrthodoxy();
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
                  props.moves.checkAndPlaceFort(selectedTile, props);

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
}
