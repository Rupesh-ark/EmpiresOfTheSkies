import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { Typography } from "@mui/material";
import { KingdomButton } from "../shared/KingdomButton";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";

const AttackOrPassDiaLog = (props: AerialBattleDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const [open, setOpen] = useState(true);

  const possibleDefenders = props.G.possibleDefenders ?? [];

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
    props.G.stage.sub === "aerial_attack_or_pass";

  return (
    <DialogShell
      open={isOpen}
      title="Choose your battle action"
      subtitle={`Battle at ${getLocationPresentation(props.G.mapState.currentTileArray, [x, y]).name} — highlighted in red on the map`}
      mood="battle"
      size="sm"
      hideActions
    >
      <Typography sx={{ mb: 2 }}>
        Choose a kingdom's fleet to attack, or pass. Decisions to attack are
        made in player order, so even if you pass you may still be attacked.
      </Typography>
      {buttons}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
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
      </div>
    </DialogShell>
  );
};

export interface AerialBattleDialogProps extends MyGameProps {}
export default AttackOrPassDiaLog;
