import { useState } from "react";
import { MyGameProps } from "@eots/game";
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

  const emptyTiles = props.G.validRelocationTiles ?? [];

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
