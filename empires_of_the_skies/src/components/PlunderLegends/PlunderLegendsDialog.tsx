import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import WorldMap from "../WorldMap/WorldMap";

const PlunderLegendsDialog = (props: MyGameProps) => {
  const [open, setOpen] = useState(true);

  return (
    <DialogShell
      open={
        open &&
        props.playerID === props.ctx.currentPlayer &&
        props.G.stage === "plunder legends" &&
        props.ctx.phase === "plunder_legends"
      }
      title="Would you like to plunder this legend?"
      mood="discovery"
      size="lg"
      confirmLabel="Plunder Legend"
      confirmColor="success"
      onConfirm={() => {
        props.moves.plunder();
        setOpen(false);
      }}
      cancelLabel="Do not Plunder"
      cancelColor="error"
      onCancel={() => {
        props.moves.doNotPlunder();
        setOpen(false);
      }}
    >
      <WorldMap
        {...props}
        selectableTiles={[props.G.mapState.currentBattle]}
      />
    </DialogShell>
  );
};

export default PlunderLegendsDialog;
