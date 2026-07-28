import { useState } from "react";
import { Chip, Typography, Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { FoWCardSelector } from "@/components/atoms/FoWCardSelector";

/**
 * Captain-General's Fortune of War decision during a Grand Army invasion —
 * only the CG may play from hand (eots42:520); anyone else's card is drawn.
 * Covers both the aerial stage (vs the Infidel Fleet) and the ground battle.
 */
const InvasionFoWDialog = (props: MyGameProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);

  const invasion = props.G.currentInvasion;
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const player = props.playerID ? props.G.playerInfo[props.playerID] : null;

  if (
    !invasion ||
    (invasion.phase !== "aerial_fow" && invasion.phase !== "ground_fow") ||
    !isMyTurn ||
    !player?.isCaptainGeneral
  ) {
    return null;
  }

  const isAerial = invasion.phase === "aerial_fow";
  const hand = player.resources.fortuneCards;

  return (
    <DecisionPanel
      open
      title={isAerial ? "Aerial Battle — Fortunes of War" : "Ground Battle — Fortunes of War"}
      subtitle={
        isAerial
          ? "Your fleet wing engages the Infidel Fleet. As Captain-General you may play a card from your hand, or draw blind."
          : "The Grand Army meets the Host. As Captain-General you may play a card from your hand, or draw blind."
      }
      mood="crisis"
      actions={
        <>
          <GameButton variant="secondary" onClick={() => props.moves.commitInvasionFoW("draw")}>
            Draw from deck
          </GameButton>
          <GameButton
            variant="primary"
            disabled={selectedIndex === undefined}
            onClick={() => props.moves.commitInvasionFoW(selectedIndex)}
          >
            Play selected card
          </GameButton>
        </>
      }
    >
      <Box sx={{ mb: 1 }}>
        <Chip
          label={`Infidel Host: ${invasion.totalHostSwords} Swords`}
          color="error"
          variant="outlined"
          sx={{ fontWeight: "bold" }}
        />
      </Box>
      {hand.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Your hand is empty — the card will be drawn from the deck.
        </Typography>
      ) : (
        <FoWCardSelector fowHand={hand} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      )}
    </DecisionPanel>
  );
};

export default InvasionFoWDialog;
