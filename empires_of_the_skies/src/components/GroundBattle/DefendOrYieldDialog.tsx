import { MyGameProps, colourToKingdomMap } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import WorldMap from "../WorldMap/WorldMap";

const DefendOrYieldDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const attackerName = props.G.battleState
    ? colourToKingdomMap[props.G.battleState.attacker.colour]
    : "ERROR";

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    props.ctx.phase === "ground_battle" &&
    props.G.stage === "defend or yield" &&
    inCurrentBattle &&
    props.G.battleState?.defender.id === props.playerID &&
    props.G.battleState.defender.decision === "undecided";

  return (
    <DialogShell
      open={isOpen}
      title="Your region is under attack!"
      subtitle={`Your fleet on tile [${1 + x}, ${4 - y}] is under attack by ${attackerName}. You can either yield the region and all its buildings or fight back. If you yield, the attacking kingdom will get control over any outposts, colonies or forts and your troops will be returned safely to your kingdom.`}
      mood="battle"
      size="lg"
      confirmLabel="Defend"
      confirmColor="success"
      onConfirm={() => props.moves.defendGroundAttack()}
      cancelLabel="Yield"
      cancelColor="error"
      onCancel={() => props.moves.yieldToAttacker()}
    >
      <WorldMap {...props} selectableTiles={[props.G.mapState.currentBattle]} />
    </DialogShell>
  );
};

export default DefendOrYieldDialog;
