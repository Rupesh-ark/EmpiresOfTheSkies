import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { findPossibleDestinations } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import WorldMap from "../WorldMap/WorldMap";

const RelocateLoserDialog = (props: MyGameProps) => {
  const [open, setOpen] = useState(true);
  const [currentTile, setCurrentTile] = useState(props.G.mapState.currentBattle);

  let victor = "";
  let loser = "";

  props.G.battleState &&
    Object.values(props.G.battleState).forEach((battler) => {
      if (battler.victorious === true) {
        victor = battler.id;
      } else {
        loser = battler.id;
      }
    });

  const possibleTiles = findPossibleDestinations(
    props.G,
    props.G.mapState.currentBattle,
    true
  );

  const emptyTiles: number[][] = [];
  for (let i = 1; i < possibleTiles.length; i++) {
    possibleTiles[i].forEach((tile) => {
      if (emptyTiles.length === 0 || i === 1) {
        if (props.G.mapState.battleMap[tile[1]][tile[0]].length === 0) {
          emptyTiles.push(tile);
        }
      }
    });
  }

  return (
    <DialogShell
      open={
        open &&
        props.playerID === props.ctx.currentPlayer &&
        (props.playerID === victor ||
          (props.playerID === props.G.battleState?.attacker.id &&
            props.G.battleState?.defender.decision === "evade"))
      }
      title={`Choose a tile to send the loser to. Current selection: [${currentTile[0]}, ${currentTile[1]}]`}
      mood="battle"
      size="lg"
      confirmLabel="Confirm"
      confirmColor="success"
      onConfirm={() => {
        props.moves.relocateDefeatedFleet(currentTile, loser);
        setOpen(false);
      }}
    >
      <WorldMap
        {...props}
        alternateOnClick={(coords: number[]) => {
          setCurrentTile(coords);
        }}
        selectableTiles={emptyTiles}
      />
    </DialogShell>
  );
};

export default RelocateLoserDialog;
