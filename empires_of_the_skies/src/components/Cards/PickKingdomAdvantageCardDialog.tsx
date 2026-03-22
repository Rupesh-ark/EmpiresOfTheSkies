import { useState } from "react";
import { Chip } from "@mui/material";
import { MyGameProps, KingdomAdvantageCard } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";

const CARD_LABELS: Record<KingdomAdvantageCard, string> = {
  elite_regiments: "Elite Regiments",
  improved_training: "Improved Training",
  licenced_smugglers: "Licenced Smugglers",
  more_efficient_taxation: "More Efficient Taxation",
  more_prisons: "More Prisons",
  patriarch_of_the_church: "Patriarch of the Church",
  sanctioned_piracy: "Sanctioned Piracy",
};

const PickKingdomAdvantageCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<KingdomAdvantageCard | undefined>(undefined);

  const isOpen =
    props.ctx.phase === "kingdom_advantage" &&
    props.ctx.currentPlayer === props.playerID;

  const availableCards = props.G.cardDecks.kingdomAdvantagePool;

  return (
    <DialogShell
      open={isOpen}
      title="Pick a Kingdom Advantage Card"
      subtitle="This card gives you a permanent rule advantage for the entire game."
      mood="discovery"
      size="sm"
      confirmLabel="Choose Card"
      confirmDisabled={!selectedCard}
      onConfirm={() => {
        props.moves.pickKingdomAdvantageCard(selectedCard);
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
        {availableCards.map((card) => (
          <Chip
            key={card}
            label={CARD_LABELS[card]}
            onClick={() => setSelectedCard(card)}
            variant={selectedCard === card ? "filled" : "outlined"}
            color={selectedCard === card ? "primary" : "default"}
            style={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
          />
        ))}
      </div>
    </DialogShell>
  );
};

export default PickKingdomAdvantageCardDialog;
