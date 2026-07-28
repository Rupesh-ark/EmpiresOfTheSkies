import { useState } from "react";
import { Typography, Box, Chip } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { FoWCardSelector } from "@/components/atoms/FoWCardSelector";
import { getLocationPresentation } from "@/utils/locationLabels";

/**
 * Retaking a rebel-occupied building — the attacker commits a Fortune of War
 * card (hand or blind draw) against the occupying counter.
 */
const OccupationBattleDialog = (props: MyGameProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);

  const occupation = props.G.currentOccupationBattle;
  const player = props.playerID ? props.G.playerInfo[props.playerID] : null;

  if (
    !occupation ||
    props.G.step !== "occupation_battle" ||
    occupation.attackerPlayerID !== props.playerID ||
    props.ctx.currentPlayer !== props.playerID ||
    !player
  ) {
    return null;
  }

  const loc = getLocationPresentation(props.G.mapState.currentTileArray, occupation.tile);
  const hand = player.resources.fortuneCards;

  return (
    <DecisionPanel
      open
      title={`Retake ${loc.name}`}
      subtitle="Your fleet can assault the occupiers — or leave them holding the building. Attacking commits a Fortune of War."
      mood="battle"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => props.moves.commitOccupationBattleCard("pass")}>
            Leave them be
          </GameButton>
          <GameButton variant="secondary" onClick={() => props.moves.commitOccupationBattleCard()}>
            Attack — draw from deck
          </GameButton>
          <GameButton
            variant="primary"
            disabled={selectedIndex === undefined}
            onClick={() => props.moves.commitOccupationBattleCard(selectedIndex)}
          >
            Attack — play selected card
          </GameButton>
        </>
      }
    >
      <Box sx={{ mb: 1 }}>
        <Chip label={`${loc.name} · ${loc.reference}`} variant="outlined" sx={{ fontWeight: "bold" }} />
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

export default OccupationBattleDialog;
