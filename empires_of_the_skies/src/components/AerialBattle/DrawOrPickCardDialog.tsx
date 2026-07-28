import { useState } from "react";
import { MyGameProps } from "@eots/game";
import FortuneOfWarCardDisplay from "../PlayerBoard/FortuneOfWarCardDisplay";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { fowCardSrc } from "@/assets/fowCardArt";
import { NO_EFFECT_CARD } from "@/assets/fortuneOfWarCards";
import { tokens } from "@/theme";

const DrawOrPickCardDialog = (props: MyGameProps) => {
  const [currentCard, setCurrentCard] = useState(0);

  // Visibility: battleState identity, not battleMap presence — a ground-battle
  // defender has no fleet at the tile but must still commit a card.
  const bs = props.G.battleState;
  const isMyTurn = props.playerID === props.ctx.currentPlayer;

  // Mirrors the engine's ground_resolve/aerial_resolve routing: attacker
  // commits first, then the defender.
  const isMyCommit =
    bs !== undefined &&
    ((bs.attacker.id === props.playerID && !bs.attacker.fowCard) ||
      (bs.defender.id === props.playerID &&
        !!bs.attacker.fowCard &&
        !bs.defender.fowCard));

  const isBattleReady =
    bs?.attacker.decision === "fight" &&
    bs?.defender.decision === "fight" &&
    !bs?.attacker.victorious &&
    !bs?.defender.victorious;

  const isConquestDraw =
    props.G.step === "conquest_draw_or_pick" &&
    props.G.conquestState !== undefined &&
    props.G.conquestState.id === props.playerID;

  const isOpen = isMyTurn && ((isBattleReady && isMyCommit) || isConquestDraw);

  // Move dispatch
  const isConquest = props.G.step === "conquest_draw_or_pick";
  const handlePick = () =>
    isConquest ? props.moves.pickCardConquest(currentCard) : props.moves.pickCard(currentCard);
  const handleDraw = () =>
    isConquest ? props.moves.drawCardConquest() : props.moves.drawCard();

  // Card hand
  const hand = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
    .resources.fortuneCards;

  // eots42: the attacker picks and reveals first — show the defender what
  // they are answering before they choose.
  const attackerCard =
    bs && bs.defender.id === props.playerID ? bs.attacker.fowCard : undefined;

  return (
    <DialogShell
      open={isOpen}
      title="Draw or Pick a Card"
      subtitle="You can either draw a random Fortune of War card, or pick one from your hand."
      mood="battle"
      size="sm"
      hideActions
    >
      {attackerCard && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img
            src={fowCardSrc(attackerCard.sword, attackerCard.shield) ?? NO_EFFECT_CARD}
            alt={
              attackerCard.sword > 0
                ? `${attackerCard.sword} Swords`
                : attackerCard.shield > 0
                  ? `${attackerCard.shield} Shields`
                  : "No Effect"
            }
            style={{ width: 68 }}
          />
          <span style={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text }}>
            The attacker has revealed{" "}
            <strong>
              {attackerCard.sword > 0
                ? `${attackerCard.sword} Sword${attackerCard.sword > 1 ? "s" : ""}`
                : attackerCard.shield > 0
                  ? `${attackerCard.shield} Shield${attackerCard.shield > 1 ? "s" : ""}`
                  : "No Effect"}
            </strong>
          </span>
        </div>
      )}
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
