import { useState } from "react";
import { MyGameProps, colourToKingdomMap } from "@eots/game";
import { Typography } from "@mui/material";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";
import { tokens } from "@/theme";

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
    <DecisionPanel
      open={isOpen}
      title="Your fleet is under attack!"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      actions={
        <>
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
        </>
      }
    >
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm }}>
        Your fleet at {getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} is under attack by{" "}
        {props.G.battleState
          ? colourToKingdomMap[props.G.battleState?.attacker.colour]
          : "ERROR"}
        . You can either evade or fight back. If you evade, the attacking
        kingdom will get to move your fleet to an adjoining tile of their
        choosing.
      </Typography>
    </DecisionPanel>
  );
};

interface AttackOrEvadeDialogProps extends MyGameProps {}
export default AttackOrEvadeDialog;
