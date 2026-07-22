import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { Typography } from "@mui/material";
import { getLocationPresentation } from "@/utils/locationLabels";

const PlunderLegendsDialog = (props: MyGameProps) => {
  const [open, setOpen] = useState(true);

  return (
    <DialogShell
      open={
        open &&
        props.playerID === props.ctx.currentPlayer &&
        props.G.step === "plunder_legends"
      }
      title="Would you like to plunder this legend?"
      subtitle={`${getLocationPresentation(props.G.mapState.currentTileArray, props.G.mapState.currentBattle).name} — highlighted on the map`}
      mood="discovery"
      size="sm"
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
      <Typography>
        Plundering a Legend earns its Gold and Goods rewards, but advances
        your Heresy track marker by one space.
      </Typography>
    </DialogShell>
  );
};

export default PlunderLegendsDialog;
