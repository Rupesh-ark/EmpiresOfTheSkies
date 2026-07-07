import { useState } from "react";
import { MyGameProps, colourToKingdomMap } from "@eots/game";
import { Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";

const AttackOrEvadeDialog = (props: AttackOrEvadeDialogProps) => {
  const [open, setOpen] = useState(true);
  const [x, y] = props.G.mapState.currentBattle;
  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const isOpen =
    open &&
    props.ctx.currentPlayer === props.playerID &&
    inCurrentBattle &&
    props.G.battleState?.defender.id === props.playerID &&
    props.G.battleState.defender.decision === "undecided";

  return (
    <DialogShell
      open={isOpen}
      title="Your fleet is under attack!"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      size="sm"
      hideActions
    >
      <Typography sx={{ mb: 2 }}>
        Your fleet at {getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} is under attack by{" "}
        {props.G.battleState
          ? colourToKingdomMap[props.G.battleState?.attacker.colour]
          : "ERROR"}
        . You can either evade or fight back. If you evade, the attacking
        kingdom will get to move your fleet to an adjoining tile of their
        choosing.
      </Typography>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <GameButton
          variant="ghost"
          onClick={() => { props.moves.evadeAttackingFleet(); setOpen(false); }}
        >
          Evade
        </GameButton>
        <GameButton
          variant="danger"
          onClick={() => { props.moves.retaliate(); setOpen(false); }}
        >
          Attack!
        </GameButton>
      </div>
    </DialogShell>
  );
};

interface AttackOrEvadeDialogProps extends MyGameProps {}
export default AttackOrEvadeDialog;
