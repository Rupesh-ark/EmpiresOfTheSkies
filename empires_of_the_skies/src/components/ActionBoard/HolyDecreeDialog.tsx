import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
} from "@mui/material";
import { MyGameProps } from "@eots/game";
import {
  findMostHereticalKingdoms,
  findMostOrthodoxKingdoms,
} from "@eots/game";
import React, { useState } from "react";
import { ButtonRow } from "./ActionBoardButtonRow";
import { KingdomButton } from "../shared/KingdomButton";
//Consider using a dropdown menu for selecting the kingdom to curse or bless, could make the experience clearer
const HolyDecreeDialog = (props: HolyDecreeDialogProps) => {
  const mostHereticalKingdoms = findMostHereticalKingdoms(props.G);
  let hereticButtons: JSX.Element[] = [];
  const [hereticKingdom, setHereticKingdom] = useState(
    mostHereticalKingdoms[0]
  );

  mostHereticalKingdoms.forEach((id) => {
    hereticButtons.push(
      <KingdomButton
        selectedKingdom={hereticKingdom}
        setSelectedKingdom={setHereticKingdom}
        id={id}
        {...props}
        key={`Holy decree heretic kingdom button-${id}`}
      ></KingdomButton>
    );
  });
  const mostOrthodoxKingdoms = findMostOrthodoxKingdoms(props.G);
  let orthodoxButtons: JSX.Element[] = [];
  const [orthodoxKingdom, setOrthodoxKingdom] = useState(
    mostOrthodoxKingdoms[0]
  );
  mostOrthodoxKingdoms.forEach((id) => {
    orthodoxButtons.push(
      <KingdomButton
        selectedKingdom={orthodoxKingdom}
        setSelectedKingdom={setOrthodoxKingdom}
        id={id}
        {...props}
        key={`Holy decree orthodox kingdom button-${id}`}
      ></KingdomButton>
    );
  });
  return (
    <Dialog open={props.open}>
      <DialogTitle>
        What is thy divine will, oh mighty Arch Prelate?
      </DialogTitle>
      <DialogContent>
        <Button
          variant="text"
          style={{ border: "none", height: "45px", overflow: "visible" }}
          onClick={() => {
            props.moves.issueHolyDecree("curse monarch", hereticKingdom);
            props.setOpen(false);
          }}
        >
          <h2>Curse a Heretic Monarch</h2>
        </Button>
        <h4>
          Choose a heretic monarch and reduce their victory points by the number
          of orthodox kingdoms divided by 3 (rounded down). If there are no
          heretic monarchs, the orthodox kingdom with the most advanced heresy
          tracker can be chosen instead. If there are multiple qualifying
          kingdoms, the Arch Prelate chooses.
        </h4>
        <ButtonRow>{hereticButtons}</ButtonRow>
        <Button
          variant="text"
          style={{ border: "none", height: "45px", overflow: "visible" }}
          onClick={() => {
            props.moves.issueHolyDecree("bless monarch", orthodoxKingdom);
            props.setOpen(false);
          }}
        >
          <h2>Bless an Orthodox Monarch</h2>
        </Button>
        <h4>
          Bless the orthodox monarch who has the least advanced heresy tracker
          and increase their victory points by the number of orthodox kingdoms
          divided by three (rounding down). If multiple monarchs qualify then
          the Arch Prelate chooses. A heretic monarch may never be blessed.
        </h4>
        <ButtonRow>{orthodoxButtons}</ButtonRow>
        <Button
          variant="text"
          style={{ border: "none", height: "45px", overflow: "visible" }}
          onClick={() => {
            props.moves.issueHolyDecree("reform dogma");
            props.setOpen(false);
          }}
        >
          <h3>Reform Dogma</h3>
        </Button>
        <h4>All players retreat their Heresy track markers one space</h4>
        <Button
          variant="text"
          style={{ border: "none", height: "45px", overflow: "visible" }}
          onClick={() => {
            props.moves.issueHolyDecree("confirm dogma");
            props.setOpen(false);
          }}
        >
          <h3>Confirm Dogma</h3>
        </Button>
        <h4>All players advance their Heresy track markers one space</h4>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            props.setOpen(false);
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface HolyDecreeDialogProps extends MyGameProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export default HolyDecreeDialog;
