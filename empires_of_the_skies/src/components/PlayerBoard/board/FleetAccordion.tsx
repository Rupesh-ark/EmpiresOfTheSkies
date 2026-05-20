import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { FleetInfo, MyGameState } from "@eots/game";
import { IconSkyship, IconRegiment, IconElite, IconLevy } from "@/theme";
import { GamePanel } from "@/components/atoms/GamePanel";
import { SectionHeader } from "./SectionHeader";
import { getLocationPresentation } from "@/utils/locationLabels";

interface FleetAccordionProps {
  fleets: FleetInfo[];
  tileMap: MyGameState["mapState"]["currentTileArray"];
  onViewLocation?: (location: number[]) => void;
}

export const FleetAccordion = ({
  fleets,
  tileMap,
  onViewLocation,
}: FleetAccordionProps) => {
  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Fleets" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {fleets.map((fleet) => {
          const loc = getLocationPresentation(tileMap, fleet.location);

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
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.sm,
                  color: tokens.ui.text,
                  flex: 1,
                  lineHeight: 1.3,
                }}
              >
                Fleet {fleet.fleetId + 1}
                <Box
                  component="span"
                  sx={{ color: tokens.ui.textMuted, ml: 0.5 }}
                >
                  — {loc.name} [{loc.reference}]
                </Box>
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: "6px",
                  flexShrink: 0,
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
              </Box>
            </Box>
          );
        })}
      </Box>
    </GamePanel>
  );
};
