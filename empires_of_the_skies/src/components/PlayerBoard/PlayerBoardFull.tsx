/**
 * PlayerBoardFull — actions phase only.
 *
 * Four sections stacked vertically in a scrollable left panel:
 *   1. Available Forces (resource chips)
 *   2. Kingdom Actions (counsellor placement buttons)
 *   3. Fleets (accordion with skyship visuals)
 *   4. Cards (drawer tabs: FoW / Legacy / KA)
 */
import { memo } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.webp";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.webp";

import { Holdings } from "./Holdings";
import { Treasury, AvailableForces, KingdomActions, FleetAccordion, CardDrawers } from "./board";
import { getAvailableActions } from "@/utils/gameHelpers";

interface PlayerBoardFullProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
}

export const PlayerBoardFull = memo((props: PlayerBoardFullProps) => {
  const playerInfo = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: `${tokens.spacing.sm}px`,
        p: `${tokens.spacing.sm}px`,
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: "transparent",
        borderTop: `3px solid ${colour}`,
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: tokens.ui.surfaceHover,
          borderRadius: 3,
          "&:hover": { background: tokens.ui.textMuted },
        },
      }}
    >
      <Box sx={{ px: `${tokens.spacing.xs}px` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: colour,
              boxShadow: `0 0 6px ${colour}66`,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.lg,
              color: colour,
              lineHeight: 1.2,
              textShadow: `0 1px 2px rgba(0,0,0,0.5), 0 0 12px ${colour}44`,
            }}
          >
            {playerInfo.kingdomName}
          </Typography>
          {(playerInfo.isArchprelate || playerInfo.isCaptainGeneral) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", ml: "auto" }}>
              {playerInfo.isArchprelate && (
                <Box
                  component="img"
                  src={popeLogo}
                  alt="Archprelate"
                  sx={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    filter: "sepia(0.6) saturate(1.5) hue-rotate(260deg) brightness(0.9)",
                    opacity: 0.75,
                  }}
                />
              )}
              {playerInfo.isCaptainGeneral && (
                <Box
                  component="img"
                  src={captainGeneralLogo}
                  alt="Captain-General"
                  sx={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    filter: "sepia(0.6) saturate(1.5) hue-rotate(90deg) brightness(0.9)",
                    opacity: 0.75,
                  }}
                />
              )}
            </Box>
          )}
        </Box>
        {(playerInfo.isArchprelate || playerInfo.isCaptainGeneral) && (
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.gold,
              fontStyle: "italic",
              lineHeight: 1.2,
              pl: `${tokens.spacing.sm + 12}px`,
            }}
          >
            {[
              playerInfo.isArchprelate && "Seat of the Archprelate",
              playerInfo.isCaptainGeneral && "Captain-General of the Faith",
            ].filter(Boolean).join(" · ")}
          </Typography>
        )}
      </Box>

      <Treasury
        availableActions={getAvailableActions(playerInfo)}
        maxActions={playerInfo.resources.counsellors}
        gold={playerInfo.resources.gold}
        victoryPoints={playerInfo.resources.victoryPoints}
        heresyTracker={playerInfo.heresyTracker}
        hereticOrOrthodox={playerInfo.hereticOrOrthodox}
      />

      <AvailableForces
        regiments={playerInfo.resources.regiments}
        eliteRegiments={playerInfo.resources.eliteRegiments ?? 0}
        levies={playerInfo.resources.levies}
        skyships={playerInfo.resources.skyships}
      />

      <KingdomActions
        colour={colour}
        shipyards={playerInfo.shipyards}
        counsellorLocations={playerInfo.playerBoardCounsellorLocations}
        moves={props.moves}
      />

      <FleetAccordion
        fleets={playerInfo.fleetInfo}
        tileMap={props.G.mapState.currentTileArray}
        onViewLocation={props.onOpenFleetLocation}
      />

      <CardDrawers
        fortuneCards={playerInfo.resources.fortuneCards}
        legacyCard={playerInfo.resources.legacyCard}
        advantageCard={playerInfo.resources.advantageCard}
        eventCards={playerInfo.resources.eventCards}
        resolvedEvent={props.G.eventState.resolvedEvent}
        eventContributions={props.G.eventState.eventContributions}
        playerInfo={props.G.playerInfo}
      />

      <Holdings {...props} variant="full" />
    </Box>
  );
});
