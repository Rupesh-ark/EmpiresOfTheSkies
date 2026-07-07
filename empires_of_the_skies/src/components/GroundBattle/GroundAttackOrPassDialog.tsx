import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { Typography } from "@mui/material";
import { getLocationPresentation } from "@/utils/locationLabels";

const GroundAttackOrPassDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    inCurrentBattle &&
    props.G.battleState === undefined &&
    props.G.stage.sub === "ground_attack_or_pass";

  return (
    <DialogShell
      open={isOpen}
      title="Choose your battle action"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      size="sm"
      confirmLabel="Attack!"
      confirmColor="success"
      onConfirm={() => props.moves.attackPlayersBuilding()}
      cancelLabel="Pass"
      cancelColor="error"
      onCancel={() => props.moves.doNotGroundAttack()}
    >
      <Typography>
        Do you want to attack this enemy's region? You must completely wipe
        them out in order to take control.
      </Typography>
    </DialogShell>
  );
};

export default GroundAttackOrPassDialog;
