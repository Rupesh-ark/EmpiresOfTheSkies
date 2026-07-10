import { useState, useMemo } from "react";
import { MyGameProps, KINGDOM_LOCATION, tileKey, wouldPlacementConnectRoute, getRoutePlacementTiles, FAITHDOM_TILES } from "@eots/game";
import { Box, Typography, Switch } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { tokens } from "@/theme";
import { IconSkyship, IconRegiment, IconLevy } from "@/theme";
import { getLocationPresentation } from "@/utils/locationLabels";

type RouteOption = "placeAt" | "trail" | null;

const RetrieveFleetsDialog = (props: MyGameProps) => {
  const [selectedFleets, setSelectedFleets] = useState<number[]>([]);
  const [routeToggles, setRouteToggles] = useState<Record<number, boolean>>({});

  const playerID = props.playerID ?? props.ctx.currentPlayer;
  const player = props.G.playerInfo[playerID];
  const [homeX, homeY] = KINGDOM_LOCATION;
  const deployedFleets = useMemo(() =>
    player?.fleetInfo.filter(
      (f) =>
        (f.location[0] !== homeX || f.location[1] !== homeY) &&
        f.skyships + f.regiments + f.levies + f.eliteRegiments > 0
    ) ?? [], [player, homeX, homeY]);

  // Compute which route option each fleet gets
  const fleetRouteOptions = useMemo(() => {
    const options: Record<number, RouteOption> = {};
    for (const fleet of deployedFleets) {
      const fleetTile = tileKey(fleet.location[0], fleet.location[1]);
      const isFaithdom = FAITHDOM_TILES.some(([fx, fy]) => fx === fleet.location[0] && fy === fleet.location[1]);
      if (isFaithdom || fleet.skyships <= 0) {
        options[fleet.fleetId] = null;
      } else if (wouldPlacementConnectRoute(props.G, playerID, fleetTile)) {
        options[fleet.fleetId] = "placeAt";
      } else if (fleet.skyships > 1 && fleet.travelHistory.length > 0) {
        options[fleet.fleetId] = "trail";
      } else {
        options[fleet.fleetId] = null;
      }
    }
    return options;
  }, [deployedFleets, props.G, playerID]);

  // Skyships each route option would actually consume — computed by the same
  // engine function the retrieveFleets move uses, so the displayed cost can
  // never drift from the real deduction.
  const routeCost = useMemo(() => {
    const costs: Record<number, number> = {};
    for (const fleet of deployedFleets) {
      const option = fleetRouteOptions[fleet.fleetId];
      if (option) {
        costs[fleet.fleetId] = getRoutePlacementTiles(props.G, playerID, fleet, option).length;
      }
    }
    return costs;
  }, [deployedFleets, fleetRouteOptions, props.G, playerID]);

  const toggleFleet = (fleetId: number) => {
    setSelectedFleets((prev) =>
      prev.includes(fleetId)
        ? prev.filter((id) => id !== fleetId)
        : [...prev, fleetId]
    );
  };

  const toggleRoute = (fleetId: number) => {
    setRouteToggles((prev) => ({ ...prev, [fleetId]: !prev[fleetId] }));
  };

  const handleConfirm = () => {
    const placeAt: number[] = [];
    const trailFrom: number[] = [];
    for (const idx of selectedFleets) {
      if (routeToggles[idx]) {
        const option = fleetRouteOptions[idx];
        if (option === "placeAt") placeAt.push(idx);
        else if (option === "trail") trailFrom.push(idx);
      }
    }
    const options = (placeAt.length > 0 || trailFrom.length > 0)
      ? {
        ...(placeAt.length > 0 ? { placeAt } : {}),
        ...(trailFrom.length > 0 ? { trailFrom } : {}),
      }
      : undefined;
    props.moves.retrieveFleets(selectedFleets, options);
  };

  const isOpen =
    props.G.stage.sub === "retrieve_fleets" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <DialogShell
      open={isOpen}
      title="Retrieve Fleets"
      subtitle="Select fleets to bring home. Toggle route options to leave skyship markers."
      mood="peacetime"
      size="sm"
      confirmLabel="Retrieve"
      confirmColor="success"
      confirmDisabled={selectedFleets.length === 0}
      onConfirm={handleConfirm}
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
          const routeOption = fleetRouteOptions[fleet.fleetId];
          const routeEnabled = routeToggles[fleet.fleetId] ?? false;
          return (
            <Box key={fleet.fleetId}>
              <Box
                onClick={() => toggleFleet(fleet.fleetId)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: routeOption && isSelected
                    ? `${tokens.radius.md}px ${tokens.radius.md}px 0 0`
                    : `${tokens.radius.md}px`,
                  border: isSelected
                    ? `2px solid ${tokens.ui.gold}`
                    : `1px solid ${tokens.ui.border}`,
                  borderBottom: routeOption && isSelected
                    ? "none"
                    : undefined,
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

              {routeOption && isSelected && (routeCost[fleet.fleetId] ?? 0) > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: `0 0 ${tokens.radius.md}px ${tokens.radius.md}px`,
                    border: `2px solid ${tokens.ui.gold}`,
                    borderTop: `1px solid ${tokens.ui.border}`,
                    background: routeEnabled ? `${tokens.ui.gold}08` : tokens.ui.surface,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: tokens.font.body,
                      fontSize: tokens.fontSize.xs,
                      color: tokens.ui.textMuted,
                    }}
                  >
                    {routeOption === "placeAt"
                      ? `Place Route Skyship (${routeCost[fleet.fleetId] ?? 0} skyship)`
                      : `Leave Trade Route (${routeCost[fleet.fleetId] ?? 0} skyships)`}
                  </Typography>
                  <Switch
                    size="small"
                    checked={routeEnabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleRoute(fleet.fleetId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
              )}
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
