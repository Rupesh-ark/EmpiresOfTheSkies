import { MyGameProps } from "@eots/game";
import { Typography } from "@mui/material";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";
import { tokens } from "@/theme";

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
    <DecisionPanel
      open={isOpen}
      title="Choose your battle action"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => props.moves.doNotGroundAttack()}>
            Pass
          </GameButton>
          <GameButton variant="danger" onClick={() => props.moves.attackPlayersBuilding()}>
            Attack!
          </GameButton>
        </>
      }
    >
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm }}>
        Do you want to attack this enemy's region? You must completely wipe
        them out in order to take control.
      </Typography>
    </DecisionPanel>
  );
};

export default GroundAttackOrPassDialog;
