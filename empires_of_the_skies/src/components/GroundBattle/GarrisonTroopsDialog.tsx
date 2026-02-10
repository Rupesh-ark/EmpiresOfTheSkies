import React, { useState } from "react";
import { MyGameProps } from "../../types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import WorldMap from "../WorldMap/WorldMap";
import { ButtonRow } from "../ActionBoard/ActionBoardButtonRow";

const GarrisonTroopsDialog = (props: GarrisonTroopsDialogProps) => {
  const [open, setOpen] = useState(true);
  const [x, y] = props.G.mapState.currentBattle;
  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  let hasTroopsToGarrison = false;
  props.G.playerInfo[props.ctx.currentPlayer].fleetInfo.forEach((fleet) => {
    const [fleetX, fleetY] = fleet.location;
    if (!hasTroopsToGarrison && fleetX === x && fleetY === y) {
      hasTroopsToGarrison = fleet.levies > 0 || fleet.regiments > 0;
    }
  });

  if (
    props.G.stage === "garrison troops" &&
    props.ctx.currentPlayer === props.playerID &&
    !(
      props.ctx.phase === "ground_battle" &&
      inCurrentBattle &&
      props.G.battleState?.attacker.id === props.playerID &&
      props.G.battleState.attacker.victorious === true &&
      hasTroopsToGarrison
    ) &&
    !(props.ctx.phase === "conquest" && inCurrentBattle && hasTroopsToGarrison)
  ) {
    console.log("Hold onto your hats!! We are entering the loop!!!");
    console.log(props.ctx.phase);
    props.ctx.phase === "ground_battle"
      ? props.moves.doNotGroundAttack()
      : props.moves.doNothing();
  }

  const [levyCountForDispatch, setLevyCountForDispatch] = useState(
    props.G.mapState.buildings[y][x].garrisonedLevies
  );
  const [regimentCount, setRegimentCount] = useState(
    props.G.mapState.buildings[y][x].garrisonedRegiments
  );

  const playerInfo =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  let playerRegiments = 0;
  let playerLevies = 0;
  props.G.playerInfo[
    props.playerID ?? props.ctx.currentPlayer
  ].fleetInfo.forEach((fleet) => {
    const [fleetX, fleetY] = fleet.location;
    if (fleetX === x && fleetY === y) {
      playerRegiments += fleet.regiments;
      playerLevies += fleet.levies;
    }
  });
  const regimentsDisabled = regimentCount >= playerRegiments;
  const leviesDisabled = levyCountForDispatch >= playerLevies;

  return (
    <Dialog
      maxWidth={"xl"}
      open={
        open &&
        props.ctx.currentPlayer === props.playerID &&
        props.G.stage === "garrison troops" &&
        ((props.ctx.phase === "ground_battle" &&
          inCurrentBattle &&
          props.G.battleState?.attacker.id === props.playerID &&
          props.G.battleState.attacker.victorious === true &&
          hasTroopsToGarrison) ||
          (props.ctx.phase === "conquest" &&
            inCurrentBattle &&
            hasTroopsToGarrison))
      }
    >
      <DialogTitle>Who would you like to garrison?</DialogTitle>
      <DialogContent>
        {`You can choose yo garrison troops or leave the region undefended.`}

        <ButtonRow>
          <Button
            onClick={() => {
              setRegimentCount(regimentCount + 1);
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "30px",
              height: "100%",
              fontSize: "30px",
              cursor: regimentsDisabled ? "not-allowed" : "pointer",
              color: regimentsDisabled ? "grey" : "#000000",
            }}
            disabled={regimentsDisabled}
          >
            +
          </Button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: regimentsDisabled ? "grey" : "#000000",
            }}
          >
            {regimentCount}
            <svg
              width="28"
              height="100%"
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
          </div>
          <Button
            onClick={() => {
              setRegimentCount(regimentCount - 1);
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "30px",
              height: "100%",
              fontSize: "30px",
              cursor: regimentCount <= 0 ? "not-allowed" : "pointer",
              color: regimentCount <= 0 ? "grey" : "#000000",
            }}
            disabled={regimentCount <= 0}
          >
            -
          </Button>
          <Button
            onClick={() => {
              setLevyCountForDispatch(levyCountForDispatch + 1);
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "30px",
              height: "100%",
              fontSize: "30px",
              cursor: leviesDisabled ? "not-allowed" : "pointer",
              color: leviesDisabled ? "grey" : "#000000",
            }}
            disabled={leviesDisabled}
          >
            +
          </Button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: leviesDisabled ? "grey" : "#000000",
            }}
          >
            {levyCountForDispatch}
            <svg
              width="28"
              height="100%"
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
          </div>
          <Button
            onClick={() => {
              setLevyCountForDispatch(levyCountForDispatch - 1);
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "30px",
              height: "100%",
              fontSize: "30px",
              cursor: levyCountForDispatch <= 0 ? "not-allowed" : "pointer",
              color: levyCountForDispatch <= 0 ? "grey" : "#000000",
            }}
            disabled={levyCountForDispatch <= 0}
          >
            -
          </Button>
        </ButtonRow>

        <WorldMap
          {...props}
          selectableTiles={[props.G.mapState.currentBattle]}
        ></WorldMap>
      </DialogContent>
      <DialogActions>
        <Button
          color="warning"
          variant="contained"
          onClick={() => {
            props.ctx.phase === "ground_attack"
              ? props.moves.doNotGroundAttack()
              : props.moves.doNothing();

            setOpen(false);
          }}
        >
          Pass
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            // props.G.playerInfo[
            //   props.playerID ?? props.ctx.currentPlayer
            // ].troopsToGarrison = {
            //   regiments: regimentCount,
            //   levies: levyCountForDispatch,
            // };
            props.moves.garrisonTroops([regimentCount, levyCountForDispatch]);
            setOpen(false);
          }}
        >
          Garrison
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface GarrisonTroopsDialogProps extends MyGameProps {}

export default GarrisonTroopsDialog;
