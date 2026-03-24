import { useState } from "react";
import { MyGameProps, KINGDOM_LOCATION } from "@eots/game";
import { Box, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { tokens } from "@/theme";
import { IconSkyship, IconRegiment, IconLevy } from "@/theme";
import { getLocationPresentation } from "@/utils/locationLabels";

const RetrieveFleetsDialog = (props: MyGameProps) => {
  const [selectedFleets, setSelectedFleets] = useState<number[]>([]);

  const player = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const [homeX, homeY] = KINGDOM_LOCATION;
  const deployedFleets = player?.fleetInfo.filter(
    (f) => f.location[0] !== homeX || f.location[1] !== homeY
  ) ?? [];

  const toggleFleet = (fleetId: number) => {
    setSelectedFleets((prev) =>
      prev.includes(fleetId)
        ? prev.filter((id) => id !== fleetId)
        : [...prev, fleetId]
    );
  };

  const isOpen =
    props.ctx.phase === "resolution" &&
    props.G.stage === "retrieve fleets" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <DialogShell
      open={isOpen}
      title="Retrieve Fleets"
      subtitle="Select fleets to bring home for restocking."
      mood="peacetime"
      size="sm"
      confirmLabel="Retrieve"
      confirmColor="success"
      confirmDisabled={selectedFleets.length === 0}
      onConfirm={() => props.moves.retrieveFleets(selectedFleets)}
      cancelLabel="Skip"
      cancelColor="error"
      onCancel={() => props.moves.retrieveFleets([])}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {deployedFleets.map((fleet) => {
          const loc = getLocationPresentation(
            props.G.mapState.currentTileArray,
            fleet.location
          );
          const isSelected = selectedFleets.includes(fleet.fleetId);
          return (
            <Box
              key={fleet.fleetId}
              onClick={() => toggleFleet(fleet.fleetId)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: `${tokens.radius.md}px`,
                border: isSelected
                  ? `2px solid ${tokens.ui.gold}`
                  : `1px solid ${tokens.ui.border}`,
                background: isSelected
                  ? `${tokens.ui.gold}12`
                  : tokens.ui.surface,
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                "&:hover": {
                  background: tokens.ui.surfaceHover,
                  boxShadow: tokens.shadow.sm,
                },
              }}
            >
              {/* Selection indicator */}
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: `${tokens.radius.sm}px`,
                  border: isSelected
                    ? `2px solid ${tokens.ui.gold}`
                    : `2px solid ${tokens.ui.borderMedium}`,
                  background: isSelected ? tokens.ui.gold : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: `all ${tokens.transition.fast}`,
                }}
              >
                {isSelected && (
                  <Typography sx={{ color: tokens.ui.white, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>
                    ✓
                  </Typography>
                )}
              </Box>

              {/* Fleet info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.25 }}>
                  <Typography
                    sx={{
                      fontFamily: tokens.font.accent,
                      fontSize: tokens.fontSize.sm,
                      fontWeight: 700,
                      color: tokens.ui.text,
                    }}
                  >
                    Fleet {fleet.fleetId + 1}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: tokens.font.body,
                      fontSize: tokens.fontSize.xs,
                      color: tokens.ui.textMuted,
                    }}
                  >
                    {loc.name}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      px: 0.5,
                      py: 0.1,
                      borderRadius: `${tokens.radius.pill}px`,
                      backgroundColor: `${tokens.ui.textMuted}15`,
                      border: `1px solid ${tokens.ui.border}`,
                      fontFamily: tokens.font.body,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: tokens.ui.textMuted,
                    }}
                  >
                    {loc.reference}
                  </Box>
                </Box>

                {/* Unit counts with icons */}
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                    <IconSkyship size={13} style={{ color: tokens.ui.textMuted }} />
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text }}>
                      {fleet.skyships}
                    </Typography>
                  </Box>
                  {fleet.regiments > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                      <IconRegiment size={13} style={{ color: tokens.ui.textMuted }} />
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text }}>
                        {fleet.regiments}
                      </Typography>
                    </Box>
                  )}
                  {fleet.levies > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                      <IconLevy size={13} style={{ color: tokens.ui.textMuted }} />
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text }}>
                        {fleet.levies}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
        {deployedFleets.length === 0 && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.textMuted,
              fontStyle: "italic",
              textAlign: "center",
              py: 2,
            }}
          >
            No fleets deployed
          </Typography>
        )}
      </Box>
    </DialogShell>
  );
};

export default RetrieveFleetsDialog;
