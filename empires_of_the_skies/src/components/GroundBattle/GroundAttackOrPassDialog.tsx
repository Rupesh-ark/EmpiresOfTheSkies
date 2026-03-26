import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import WorldMap from "../WorldMap/WorldMap";

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
      subtitle={`Do you want to attack this enemy's region? You must completely wipe them out in order to take control. Current battle tile: [${1 + x}, ${4 - y}]`}
      mood="battle"
      size="lg"
      confirmLabel="Attack!"
      confirmColor="success"
      onConfirm={() => props.moves.attackPlayersBuilding()}
      cancelLabel="Pass"
      cancelColor="error"
      onCancel={() => props.moves.doNotGroundAttack()}
    >
      <WorldMap {...props} selectableTiles={[props.G.mapState.currentBattle]} />
    </DialogShell>
  );
};

export default GroundAttackOrPassDialog;
