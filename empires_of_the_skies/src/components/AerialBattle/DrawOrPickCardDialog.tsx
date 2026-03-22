import { useState } from "react";
import { MyGameProps } from "@eots/game";
import FortuneOfWarCardDisplay from "../PlayerBoard/FortuneOfWarCardDisplay";
import WorldMap from "../WorldMap/WorldMap";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const DrawOrPickCardDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const [currentCard, setCurrentCard] = useState(0);

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  // ── Visibility ─────────────────────────────────────────────────────────
  const isMyTurn = props.playerID === props.ctx.currentPlayer && inCurrentBattle;

  const isBattleReady =
    props.G.battleState?.attacker.decision === "fight" &&
    props.G.battleState?.defender.decision === "fight" &&
    !props.G.battleState?.attacker.victorious &&
    !props.G.battleState?.defender.victorious;

  const isConquestDraw =
    props.G.stage === "conquest draw or pick card" &&
    props.ctx.phase === "conquest" &&
    props.G.conquestState !== undefined &&
    props.G.conquestState.id === props.playerID;

  const isOpen = isMyTurn && (isBattleReady || isConquestDraw);

  // ── Move dispatch ──────────────────────────────────────────────────────
  const isConquest = props.ctx.phase === "conquest";
  const handlePick = () =>
    isConquest ? props.moves.pickCardConquest(currentCard) : props.moves.pickCard(currentCard);
  const handleDraw = () =>
    isConquest ? props.moves.drawCardConquest() : props.moves.drawCard();

  // ── Card hand ──────────────────────────────────────────────────────────
  const hand = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
    .resources.fortuneCards;

  return (
    <DialogShell
      open={isOpen}
      title="Draw or Pick a Card"
      subtitle="You can either draw a random Fortune of War card, or pick one from your hand."
      mood="battle"
      size="lg"
      hideActions
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        {hand.map((_, index) => (
          <div
            key={index}
            onClick={() => setCurrentCard(index)}
            style={{
              cursor: "pointer",
              height: "fit-content",
              width: "fit-content",
              border: index === currentCard ? "2px solid black" : "none",
            }}
          >
            <FortuneOfWarCardDisplay value={index} {...props} />
          </div>
        ))}
      </div>

      <WorldMap {...props} selectableTiles={[props.G.mapState.currentBattle]} />

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <GameButton variant="primary" disabled={hand.length === 0} onClick={handlePick}>
          Use selected card
        </GameButton>
        <GameButton variant="secondary" onClick={handleDraw}>
          Draw random card
        </GameButton>
      </div>
    </DialogShell>
  );
};

export default DrawOrPickCardDialog;
