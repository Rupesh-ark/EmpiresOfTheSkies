import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { Typography } from "@mui/material";
import { KingdomButton } from "../shared/KingdomButton";
import WorldMap from "../WorldMap/WorldMap";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const AttackOrPassDiaLog = (props: AerialBattleDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const possibleDefenders: string[] = [];
  const [open, setOpen] = useState(true);

  props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].forEach((currentItem) => {
      if (currentItem !== props.playerID) {
        possibleDefenders.push(currentItem);
      }
    });

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
    props.ctx.phase === "aerial_battle" &&
    inCurrentBattle &&
    props.G.battleState === undefined &&
    props.G.stage === "attack or pass";

  return (
    <DialogShell
      open={isOpen}
      title="Choose your battle action"
      mood="battle"
      size="lg"
      hideActions
    >
      <Typography sx={{ mb: 2 }}>
        Choose a kingdom's fleet to attack, or pass. Decisions to attack are
        made in player order, so even if you pass you may still be attacked.
        Current battle tile: [{1 + x}, {4 - y}]
      </Typography>
      {buttons}
      <WorldMap
        {...props}
        selectableTiles={[props.G.mapState.currentBattle]}
      />
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
