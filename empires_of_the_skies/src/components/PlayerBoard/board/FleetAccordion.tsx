import { Box, Tooltip, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { FleetInfo, MyGameState, KINGDOM_LOCATION } from "@eots/game";
import { IconSkyship, IconRegiment, IconElite, IconLevy } from "@/theme";
import { GamePanel } from "@/components/atoms/GamePanel";
import { GameButton } from "@/components/atoms/GameButton";
import { SectionHeader } from "./SectionHeader";
import { getLocationPresentation } from "@/utils/locationLabels";

interface FleetAccordionProps {
  fleets: FleetInfo[];
  tileMap: MyGameState["mapState"]["currentTileArray"];
  onViewLocation?: (location: number[]) => void;
  /** Opens the fleet loadout dialog (home tile). Button hidden if omitted. */
  onManage?: () => void;
  /** Starts the click-to-deploy map selection for a fleet. Buttons hidden if omitted. */
  onDeploy?: (fleetId: number) => void;
  /** Fleet ids that can be deployed right now */
  deployableFleetIds?: number[];
}

const isAtHome = (fleet: FleetInfo) =>
  fleet.location[0] === KINGDOM_LOCATION[0] && fleet.location[1] === KINGDOM_LOCATION[1];

export const FleetAccordion = ({
  fleets,
  tileMap,
  onViewLocation,
  onManage,
  onDeploy,
  deployableFleetIds = [],
}: FleetAccordionProps) => {
  return (
    <GamePanel variant="default" padding="sm">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader label="Fleets" />
        {onManage && (
          <Tooltip title="Load skyships and troops onto your fleets before deploying them" placement="top" arrow>
            <span>
              <GameButton variant="secondary" size="sm" onClick={onManage}>
                Manage Fleets
              </GameButton>
            </span>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {fleets.map((fleet) => {
          const loc = getLocationPresentation(tileMap, fleet.location);
          const deployable = deployableFleetIds.includes(fleet.fleetId);
          const empty = fleet.skyships === 0;

          return (
            <Box
              key={fleet.fleetId}
              onClick={() => onViewLocation?.(fleet.location)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: `${tokens.spacing.sm}px`,
                px: `${tokens.spacing.sm}px`,
                py: `${tokens.spacing.xs}px`,
                cursor: onViewLocation ? "pointer" : "default",
                borderRadius: `${tokens.radius.sm}px`,
                "&:hover": {
                  backgroundColor: onViewLocation ? tokens.ui.surfaceHover : "transparent",
                },
                transition: `background-color ${tokens.transition.fast}`,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    color: tokens.ui.text,
                    lineHeight: 1.3,
                  }}
                >
                  Fleet {fleet.fleetId + 1}
                  <Box component="span" sx={{ color: tokens.ui.textMuted, ml: 0.5 }}>
                    — {isAtHome(fleet) ? "At home" : `${loc.name} [${loc.reference}]`}
                  </Box>
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: "6px",
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                  }}
                >
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.skyships}<IconSkyship style={{ fontSize: 12 }} /></Box>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.regiments}<IconRegiment style={{ fontSize: 12 }} /></Box>
                  {fleet.eliteRegiments > 0 && (
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.eliteRegiments}<IconElite style={{ fontSize: 12 }} /></Box>
                  )}
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.levies}<IconLevy style={{ fontSize: 12 }} /></Box>
                  {fleet.dispatchedThisRound && (
                    <Box component="span" sx={{ fontStyle: "italic" }}>· dispatched</Box>
                  )}
                </Box>
              </Box>

              {onDeploy && deployable && (
                <Tooltip
                  title="Pick a destination on the map (you can also drag the fleet flag directly)"
                  placement="top"
                  arrow
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <GameButton
                      variant="primary"
                      size="sm"
                      onClick={() => onDeploy(fleet.fleetId)}
                    >
                      Deploy
                    </GameButton>
                  </span>
                </Tooltip>
              )}
              {onDeploy && !deployable && empty && !fleet.dispatchedThisRound && (
                <Tooltip title="Add skyships via Manage Fleets before deploying" placement="top" arrow>
                  <Typography sx={{ fontSize: 10, color: tokens.ui.textMuted, fontStyle: "italic", whiteSpace: "nowrap" }}>
                    empty
                  </Typography>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>
    </GamePanel>
  );
};
