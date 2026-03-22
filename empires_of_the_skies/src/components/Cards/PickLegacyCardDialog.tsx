import { useState } from "react";
import { MyGameProps, LegacyCardInfo } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import svgNameToElementMap from "../WorldMap/nameToElementMap";

const PickLegacyCardDialog = (props: MyGameProps) => {
  const [currentCard, setCurrentCard] = useState<LegacyCardInfo | undefined>(undefined);

  const isOpen =
    props.ctx.phase === "legacy_card" &&
    props.ctx.currentPlayer === props.playerID;

  const legacyOptions =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]?.legacyCardOptions ?? [];

  return (
    <DialogShell
      open={isOpen}
      title="Pick a Legacy Card"
      subtitle="This card will be used at the end of the game to calculate your total score."
      mood="discovery"
      size="lg"
      confirmLabel="Use selected card"
      confirmDisabled={!currentCard}
      onConfirm={() => {
        props.moves.pickLegacyCard(currentCard);
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        {legacyOptions.map((card) => {
          if (!card) return null;
          const displayImage = svgNameToElementMap[card.name];
          return (
            <div
              key={`${card.name}-${card.colour}`}
              onClick={() => setCurrentCard(card)}
              style={{
                cursor: "pointer",
                height: "fit-content",
                width: "fit-content",
                border: card.name === currentCard?.name ? "2px solid black" : "none",
              }}
            >
              <svg
                style={{
                  backgroundImage: `url(${displayImage})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  width: "137px",
                  height: "250px",
                  margin: "5px",
                }}
              />
            </div>
          );
        })}
      </div>
    </DialogShell>
  );
};

export default PickLegacyCardDialog;
