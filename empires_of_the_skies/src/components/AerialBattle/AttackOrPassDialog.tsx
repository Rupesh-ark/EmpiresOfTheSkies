import { useState } from "react";
import { MyGameProps, MOVE_DEFINITIONS } from "@eots/game";
import { Typography } from "@mui/material";
import { KingdomButton } from "../shared/KingdomButton";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";
import { tokens } from "@/theme";

const AttackOrPassDiaLog = (props: AerialBattleDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const [open, setOpen] = useState(true);

  // The server list excludes only the attacker; the validator also rejects
  // already-challenged pairs after an evasion — filter with the same rule.
  const validate = MOVE_DEFINITIONS.attackOtherPlayersFleet?.validate;
  const possibleDefenders = (props.G.possibleDefenders ?? []).filter(
    (id) => !props.playerID || !validate || validate(props.G, props.playerID, id) === null
  );

  const [currentKingdom, setCurrentKingdom] = useState(possibleDefenders[0]);
  const buttons = possibleDefenders.map((currentItem) => (
    <KingdomButton
      id={currentItem}
      setSelectedKingdom={setCurrentKingdom}
      selectedKingdom={currentKingdom}
      {...props}
      key={currentItem}
    />
  ));

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const isOpen =
    open &&
    props.ctx.currentPlayer === props.playerID &&
    inCurrentBattle &&
    props.G.battleState === undefined &&
    props.G.step === "aerial_attack_or_pass";

  return (
    <DecisionPanel
      open={isOpen}
      title="Choose your battle action"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      actions={
        <>
          <GameButton
            variant="ghost"
            onClick={() => {
              props.moves.doNotAttack();
              setOpen(false);
            }}
          >
            Pass
          </GameButton>
          <GameButton
            variant="danger"
            onClick={() => {
              props.moves.attackOtherPlayersFleet(currentKingdom);
              setOpen(false);
            }}
            disabled={!currentKingdom}
          >
            Attack!
          </GameButton>
        </>
      }
    >
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, mb: 1 }}>
        Choose a kingdom's fleet to attack, or pass. Decisions to attack are
        made in player order, so even if you pass you may still be attacked.
      </Typography>
      {buttons}
    </DecisionPanel>
  );
};

export interface AerialBattleDialogProps extends MyGameProps {}
export default AttackOrPassDiaLog;
