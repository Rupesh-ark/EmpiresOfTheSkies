import { Button } from "@mui/material";
import { MyGameProps, findMostHereticalKingdoms, findMostOrthodoxKingdoms } from "@eots/game";
import React, { useState } from "react";
import { ButtonRow } from "./ActionBoardButtonRow";
import { KingdomButton } from "@/components/shared/KingdomButton";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const HolyDecreeDialog = (props: HolyDecreeDialogProps) => {
  const mostHereticalKingdoms = findMostHereticalKingdoms(props.G);
  const [hereticKingdom, setHereticKingdom] = useState(mostHereticalKingdoms[0]);

  const hereticButtons = mostHereticalKingdoms.map((id) => (
    <KingdomButton selectedKingdom={hereticKingdom} setSelectedKingdom={setHereticKingdom} id={id} {...props} key={`heretic-${id}`} />
  ));

  const mostOrthodoxKingdoms = findMostOrthodoxKingdoms(props.G);
  const [orthodoxKingdom, setOrthodoxKingdom] = useState(mostOrthodoxKingdoms[0]);

  const orthodoxButtons = mostOrthodoxKingdoms.map((id) => (
    <KingdomButton selectedKingdom={orthodoxKingdom} setSelectedKingdom={setOrthodoxKingdom} id={id} {...props} key={`orthodox-${id}`} />
  ));

  const playersWithPrisoners = Object.entries(props.G.playerInfo)
    .filter(([, p]) => p.prisoners > 0)
    .map(([id]) => id);
  const [inquisitionTarget, setInquisitionTarget] = useState(playersWithPrisoners[0] ?? "");

  const inquisitionButtons = playersWithPrisoners.map((id) => (
    <KingdomButton selectedKingdom={inquisitionTarget} setSelectedKingdom={setInquisitionTarget} id={id} {...props} key={`inq-${id}`} />
  ));

  return (
    <DialogShell
      open={props.open}
      title="What is thy divine will, oh mighty Arch Prelate?"
      mood="election"
      size="sm"
      cancelLabel="Cancel"
      onCancel={() => props.setOpen(false)}
    >
      <Button variant="text" sx={{ border: "none", height: "45px", overflow: "visible" }}
        onClick={() => { props.moves.issueHolyDecree("curse monarch", hereticKingdom); props.setOpen(false); }}>
        <h2>Curse a Heretic Monarch</h2>
      </Button>
      <h4>Choose a heretic monarch and reduce their victory points by the number of orthodox kingdoms divided by 3 (rounded down).</h4>
      <ButtonRow>{hereticButtons}</ButtonRow>

      <Button variant="text" sx={{ border: "none", height: "45px", overflow: "visible" }}
        onClick={() => { props.moves.issueHolyDecree("bless monarch", orthodoxKingdom); props.setOpen(false); }}>
        <h2>Bless an Orthodox Monarch</h2>
      </Button>
      <h4>Bless the orthodox monarch who has the least advanced heresy tracker and increase their victory points.</h4>
      <ButtonRow>{orthodoxButtons}</ButtonRow>

      <Button variant="text" sx={{ border: "none", height: "45px", overflow: "visible" }}
        disabled={playersWithPrisoners.length === 0}
        onClick={() => { props.moves.issueHolyDecree("inquisition", inquisitionTarget); props.setOpen(false); }}>
        <h2>Inquisition</h2>
      </Button>
      <h4>Target kingdom releases all prisoners, heresy advances 2</h4>
      {playersWithPrisoners.length > 0 ? (
        <ButtonRow>{inquisitionButtons}</ButtonRow>
      ) : (
        <h4 style={{ fontStyle: "italic", opacity: 0.6 }}>No player has prisoners</h4>
      )}

      <Button variant="text" sx={{ border: "none", height: "45px", overflow: "visible" }}
        onClick={() => { props.moves.issueHolyDecree("reform dogma"); props.setOpen(false); }}>
        <h3>Reform Dogma</h3>
      </Button>
      <h4>All players retreat their Heresy track markers one space</h4>

      <Button variant="text" sx={{ border: "none", height: "45px", overflow: "visible" }}
        onClick={() => { props.moves.issueHolyDecree("confirm dogma"); props.setOpen(false); }}>
        <h3>Confirm Dogma</h3>
      </Button>
      <h4>All players advance their Heresy track markers one space</h4>
    </DialogShell>
  );
};

interface HolyDecreeDialogProps extends MyGameProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export default HolyDecreeDialog;
