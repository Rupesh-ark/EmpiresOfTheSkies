import { MyGameProps, colourToKingdomMap } from "@eots/game";
import { Typography } from "@mui/material";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";
import { tokens } from "@/theme";

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
    props.G.stage.sub === "ground_defend_or_yield" &&
    inCurrentBattle &&
    props.G.battleState?.defender.id === props.playerID &&
    props.G.battleState.defender.decision === "undecided";

  return (
    <DecisionPanel
      open={isOpen}
      title="Your region is under attack!"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => props.moves.yieldToAttacker()}>
            Yield
          </GameButton>
          <GameButton variant="danger" onClick={() => props.moves.defendGroundAttack()}>
            Defend
          </GameButton>
        </>
      }
    >
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm }}>
        Your region is under attack by {attackerName}. You can either yield
        the region and all its buildings or fight back. If you yield, the
        attacking kingdom will get control over any outposts, colonies or
        forts and your troops will be returned safely to your kingdom.
      </Typography>
    </DecisionPanel>
  );
};

export default DefendOrYieldDialog;
