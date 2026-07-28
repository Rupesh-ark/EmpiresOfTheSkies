/**
 * RetrieveFleetsDialog — bring fleets home, and decide what they leave behind.
 *
 * A returning fleet can drop skyships along the path it flew, and those
 * markers are what physically link a claimed Land back to Faithdom. The old
 * panel presented this as a switch labelled with a count ("Leave Trade Route
 * (3 skyships)"), which answered the wrong question: what matters is whether
 * the chain REACHES, not how many ships it costs.
 *
 * So the choice leads with the outcome — how many of your claims the placement
 * connects — and the prospective chain is previewed on the map in your kingdom
 * colour while you decide. A short chain is legal and not wasted: skyships
 * already placed count toward a chain you finish later (eots42), so an
 * incomplete route is reported as progress rather than an error.
 */
import { useState, useMemo, useEffect } from "react";
import {
  MyGameProps, KINGDOM_LOCATION, tileKey, wouldPlacementConnectRoute,
  getRoutePlacementTiles, claimsConnectedAfterPlacement, FAITHDOM_TILES,
  buildPlayerNetwork, bfsReachable, isBuildingConnected, getPlayerBuildings,
} from "@eots/game";
import { Box, Typography } from "@mui/material";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { tokens } from "@/theme";
import { IconSkyship, IconRegiment, IconLevy } from "@/theme";
import { getLocationPresentation } from "@/utils/locationLabels";
import { useMapSelection } from "@/contexts/MapSelectionContext";

type RouteOption = "placeAt" | "trail" | null;

const RetrieveFleetsDialog = (props: MyGameProps) => {
  const [selectedFleets, setSelectedFleets] = useState<number[]>([]);
  const [routeToggles, setRouteToggles] = useState<Record<number, boolean>>({});
  const [reclaimKeys, setReclaimKeys] = useState<string[]>([]);
  const [hoveredFleet, setHoveredFleet] = useState<number | null>(null);
  const { setPreview } = useMapSelection();

  const playerID = props.playerID ?? props.ctx.currentPlayer;
  const player = props.G.playerInfo[playerID];
  const [homeX, homeY] = KINGDOM_LOCATION;

  const deployedFleets = useMemo(() =>
    player?.fleetInfo.filter(
      (f) =>
        (f.location[0] !== homeX || f.location[1] !== homeY) &&
        f.skyships + f.regiments + f.levies + f.eliteRegiments > 0
    ) ?? [], [player, homeX, homeY]);

  /** Which route mode each fleet qualifies for, and why not when it doesn't. */
  const routeInfo = useMemo(() => {
    const info: Record<number, { option: RouteOption; reason?: string }> = {};
    for (const fleet of deployedFleets) {
      const key = tileKey(fleet.location[0], fleet.location[1]);
      const atFaithdom = FAITHDOM_TILES.some(([fx, fy]) => fx === fleet.location[0] && fy === fleet.location[1]);
      if (atFaithdom) info[fleet.fleetId] = { option: null, reason: "Already in Faithdom" };
      else if (fleet.skyships <= 0) info[fleet.fleetId] = { option: null, reason: "No skyships to leave" };
      else if (wouldPlacementConnectRoute(props.G, playerID, key)) info[fleet.fleetId] = { option: "placeAt" };
      else if (fleet.travelHistory.length > 0) info[fleet.fleetId] = { option: "trail" };
      else info[fleet.fleetId] = { option: null, reason: "No flight path to mark" };
    }
    return info;
  }, [deployedFleets, props.G, playerID]);

  /** Tiles each option would occupy — the same engine call the move makes. */
  const routeTiles = useMemo(() => {
    const tiles: Record<number, [number, number][]> = {};
    for (const fleet of deployedFleets) {
      const option = routeInfo[fleet.fleetId]?.option;
      tiles[fleet.fleetId] = option ? getRoutePlacementTiles(props.G, playerID, fleet, option) : [];
    }
    return tiles;
  }, [deployedFleets, routeInfo, props.G, playerID]);

  /**
   * Why a fleet offers no placement. An option can qualify and still place
   * nothing — most often because the fleet is parked on its own claim, and a
   * claim is the chain's endpoint rather than a link. If that claim already
   * touches Faithdom the route is simply finished, which is worth saying.
   */
  const emptyNote = useMemo(() => {
    const notes: Record<number, string> = {};
    const reachable = bfsReachable(
      FAITHDOM_TILES,
      buildPlayerNetwork(props.G, playerID),
      props.G.mapState.currentTileArray
    );
    for (const fleet of deployedFleets) {
      if (!routeInfo[fleet.fleetId]?.option) continue;
      if ((routeTiles[fleet.fleetId] ?? []).length > 0) continue;
      const [fx, fy] = fleet.location;
      const here = props.G.mapState.buildings[fy]?.[fx];
      const onOwnClaim = here?.player?.id === playerID && !!here?.buildings;
      notes[fleet.fleetId] = onOwnClaim
        ? isBuildingConnected(fx, fy, reachable, props.G.mapState.currentTileArray)
          ? "Already linked to Faithdom — this claim needs no markers"
          : "Standing on your own claim — fly a fleet back through the gap to link it"
        : "Nothing to mark along this fleet's path";
    }
    return notes;
  }, [deployedFleets, routeInfo, routeTiles, props.G, playerID]);

  /** Everything armed right now, so the map preview shows the combined chain. */
  const armedTiles = useMemo(() => {
    const all: number[][] = [];
    for (const fleet of deployedFleets) {
      const armed = selectedFleets.includes(fleet.fleetId) && routeToggles[fleet.fleetId];
      const shown = armed || hoveredFleet === fleet.fleetId;
      if (shown) all.push(...(routeTiles[fleet.fleetId] ?? []));
    }
    return all;
  }, [deployedFleets, selectedFleets, routeToggles, hoveredFleet, routeTiles]);

  useEffect(() => {
    setPreview(armedTiles.length ? { tiles: armedTiles, colour: player?.colour ?? "#888" } : null);
    return () => setPreview(null);
  }, [armedTiles, player?.colour, setPreview]);

  const outcome = useMemo(
    () => claimsConnectedAfterPlacement(props.G, playerID, armedTiles as [number, number][]),
    [props.G, playerID, armedTiles]
  );

  /** This player's route markers on the map, reclaimable at retrieve time. */
  const ownMarkers = useMemo(
    () =>
      Object.keys(props.G.mapState.routeSkyships)
        .filter((key) => props.G.mapState.routeSkyships[key].includes(playerID))
        .map((key) => key.split(",").map(Number) as [number, number]),
    [props.G.mapState.routeSkyships, playerID]
  );

  /**
   * Claims still trading once armed placements AND reclaims both apply.
   * claimsConnectedAfterPlacement can only add tiles, so reclaims need the
   * network rebuilt by hand from the same engine helpers.
   */
  const netOutcome = useMemo(() => {
    if (reclaimKeys.length === 0) return null;
    const network = buildPlayerNetwork(props.G, playerID);
    reclaimKeys.forEach((k) => network.delete(k));
    armedTiles.forEach(([x, y]) => network.add(tileKey(x, y)));
    const reachable = bfsReachable(FAITHDOM_TILES, network, props.G.mapState.currentTileArray);
    const claims = getPlayerBuildings(props.G, playerID);
    const after = claims.filter(([x, y]) =>
      isBuildingConnected(x, y, reachable, props.G.mapState.currentTileArray)
    ).length;
    return { after, total: claims.length };
  }, [reclaimKeys, armedTiles, props.G, playerID]);

  const toggleFleet = (fleetId: number) =>
    setSelectedFleets((prev) =>
      prev.includes(fleetId) ? prev.filter((id) => id !== fleetId) : [...prev, fleetId]
    );

  const handleConfirm = () => {
    const placeAt: number[] = [];
    const trailFrom: number[] = [];
    for (const id of selectedFleets) {
      if (!routeToggles[id]) continue;
      const option = routeInfo[id]?.option;
      if (option === "placeAt") placeAt.push(id);
      else if (option === "trail") trailFrom.push(id);
    }
    const reclaim = reclaimKeys.map((k) => k.split(",").map(Number) as [number, number]);
    const options =
      placeAt.length || trailFrom.length || reclaim.length
        ? {
            ...(placeAt.length ? { placeAt } : {}),
            ...(trailFrom.length ? { trailFrom } : {}),
            ...(reclaim.length ? { reclaim } : {}),
          }
        : undefined;
    setPreview(null);
    props.moves.retrieveFleets(selectedFleets, options);
  };

  const isOpen = props.G.step === "retrieve_fleets" && props.ctx.currentPlayer === props.playerID;
  const after = netOutcome?.after ?? outcome.after;
  const total = netOutcome?.total ?? outcome.total;
  const gained = after - outcome.before;
  const confirmParts = [
    ...(selectedFleets.length ? [`Retrieve ${selectedFleets.length}`] : []),
    ...(reclaimKeys.length ? [`Reclaim ${reclaimKeys.length}`] : []),
  ];

  return (
    <DecisionPanel
      open={isOpen}
      title="Retrieve Fleets"
      subtitle="Fleets fly home. Any skyships you leave behind stay as trade-route markers."
      mood="peacetime"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => { setPreview(null); props.moves.retrieveFleets([]); }}>
            Skip
          </GameButton>
          <GameButton
            variant="primary"
            disabled={selectedFleets.length === 0 && reclaimKeys.length === 0}
            onClick={handleConfirm}
          >
            {confirmParts.length === 0 ? "Retrieve" : confirmParts.join(" · ")}
          </GameButton>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.sm}px` }}>
        {deployedFleets.map((fleet) => {
          const loc = getLocationPresentation(props.G.mapState.currentTileArray, fleet.location);
          const isSelected = selectedFleets.includes(fleet.fleetId);
          const { option, reason } = routeInfo[fleet.fleetId] ?? { option: null };
          const tiles = routeTiles[fleet.fleetId] ?? [];

          return (
            <Box
              key={fleet.fleetId}
              onMouseEnter={() => setHoveredFleet(fleet.fleetId)}
              onMouseLeave={() => setHoveredFleet((f) => (f === fleet.fleetId ? null : f))}
              sx={{
                borderRadius: `${tokens.radius.md}px`,
                border: isSelected ? `2px solid ${tokens.ui.gold}` : `1px solid ${tokens.ui.border}`,
                background: isSelected ? `${tokens.ui.gold}0e` : tokens.ui.surface,
                overflow: "hidden",
                transition: `all ${tokens.transition.fast}`,
              }}
            >
              <Box
                onClick={() => toggleFleet(fleet.fleetId)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: `${tokens.spacing.sm}px`,
                  px: `${tokens.spacing.sm}px`,
                  py: "8px",
                  cursor: "pointer",
                  "&:hover": { background: tokens.ui.surfaceHover },
                }}
              >
                <Box
                  sx={{
                    width: 18, height: 18, flexShrink: 0,
                    borderRadius: `${tokens.radius.sm}px`,
                    border: `2px solid ${isSelected ? tokens.ui.gold : tokens.ui.borderMedium}`,
                    background: isSelected ? tokens.ui.gold : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <Typography sx={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, fontWeight: 700, color: tokens.ui.text, lineHeight: 1.2 }}>
                      Fleet {fleet.fleetId + 1}
                    </Typography>
                    <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
                      {loc.name} · {loc.reference}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: "10px", alignItems: "center", mt: "2px" }}>
                    <Count Icon={IconSkyship} value={fleet.skyships} />
                    {fleet.regiments > 0 && <Count Icon={IconRegiment} value={fleet.regiments} />}
                    {fleet.levies > 0 && <Count Icon={IconLevy} value={fleet.levies} />}
                  </Box>
                </Box>
              </Box>

              {/* The route choice — stated as an outcome, not a switch label */}
              {option && tiles.length > 0 ? (
                <Box sx={{ display: "flex", gap: "4px", px: `${tokens.spacing.sm}px`, pb: "8px" }}>
                  {[
                    { on: false, label: "Bring all home", detail: `${fleet.skyships} return` },
                    {
                      on: true,
                      label: "Leave a trail",
                      detail: `${tiles.length} stay · ${fleet.skyships - tiles.length} return`,
                    },
                  ].map(({ on, label, detail }) => {
                    const active = (routeToggles[fleet.fleetId] ?? false) === on;
                    return (
                      <Box
                        key={String(on)}
                        onClick={() => setRouteToggles((p) => ({ ...p, [fleet.fleetId]: on }))}
                        sx={{
                          flex: 1,
                          px: "8px",
                          py: "5px",
                          borderRadius: `${tokens.radius.sm}px`,
                          cursor: "pointer",
                          border: `1px solid ${active ? tokens.ui.gold : tokens.ui.border}`,
                          backgroundColor: active ? `${tokens.ui.gold}1a` : tokens.ui.surfaceRaised,
                          transition: `all ${tokens.transition.fast}`,
                          "&:hover": { borderColor: `${tokens.ui.gold}88` },
                        }}
                      >
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: active ? 700 : 500, color: active ? tokens.ui.gold : tokens.ui.text, lineHeight: 1.2 }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
                          {detail}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                (reason || emptyNote[fleet.fleetId]) && (
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, fontStyle: "italic", color: tokens.ui.textMuted, px: `${tokens.spacing.sm}px`, pb: "8px" }}>
                    {emptyNote[fleet.fleetId] ?? `No route to leave — ${reason!.toLowerCase()}`}
                  </Typography>
                )
              )}
            </Box>
          );
        })}

        {deployedFleets.length === 0 && (
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", textAlign: "center", py: 2 }}>
            No fleets deployed
          </Typography>
        )}

        {/* Your markers already on the map — reclaimable at retrieve time */}
        {ownMarkers.length > 0 && (
          <>
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: tokens.ui.textMuted, mt: "4px" }}>
              Route markers on the map
            </Typography>
            {ownMarkers.map(([mx, my]) => {
              const key = tileKey(mx, my);
              const armed = reclaimKeys.includes(key);
              const loc = getLocationPresentation(props.G.mapState.currentTileArray, [mx, my]);
              return (
                <Box
                  key={key}
                  onClick={() =>
                    setReclaimKeys((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))
                  }
                  sx={{
                    display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`,
                    px: `${tokens.spacing.sm}px`, py: "6px",
                    borderRadius: `${tokens.radius.sm}px`, cursor: "pointer",
                    border: `1px solid ${armed ? tokens.ui.warning : tokens.ui.border}`,
                    background: armed ? `${tokens.ui.warning}12` : tokens.ui.surface,
                    transition: `all ${tokens.transition.fast}`,
                    "&:hover": { background: tokens.ui.surfaceHover },
                  }}
                >
                  <Box
                    sx={{
                      width: 16, height: 16, flexShrink: 0,
                      borderRadius: `${tokens.radius.sm}px`,
                      border: `2px solid ${armed ? tokens.ui.warning : tokens.ui.borderMedium}`,
                      background: armed ? tokens.ui.warning : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {armed && (
                      <Typography sx={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</Typography>
                    )}
                  </Box>
                  <IconSkyship size={13} style={{ color: tokens.ui.textMuted, flexShrink: 0 }} />
                  <Typography noWrap sx={{ flex: 1, fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text }}>
                    {loc.name} · {loc.reference}
                  </Typography>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, color: armed ? tokens.ui.warning : tokens.ui.textMuted }}>
                    {armed ? "Returns home" : "Stays"}
                  </Typography>
                </Box>
              );
            })}
          </>
        )}

        {/* The verdict: what the armed placements and reclaims actually achieve */}
        {(armedTiles.length > 0 || reclaimKeys.length > 0) && (
          <Box
            sx={{
              px: `${tokens.spacing.sm}px`,
              py: "6px",
              borderRadius: `${tokens.radius.sm}px`,
              border: `1px solid ${gained > 0 ? `${tokens.ui.success}66` : gained < 0 ? `${tokens.ui.danger}66` : tokens.ui.border}`,
              backgroundColor: gained > 0 ? `${tokens.ui.success}12` : gained < 0 ? `${tokens.ui.danger}12` : `${tokens.ui.textMuted}0c`,
            }}
          >
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: gained > 0 ? tokens.ui.success : gained < 0 ? tokens.ui.danger : tokens.ui.text, fontWeight: 600, lineHeight: 1.35 }}>
              {gained > 0
                ? `Connects ${gained} ${gained === 1 ? "claim" : "claims"} to Faithdom — ${after} of ${total} trading`
                : gained < 0
                  ? `Disconnects ${-gained} ${gained === -1 ? "claim" : "claims"} from Faithdom — ${after} of ${total} still trading`
                  : reclaimKeys.length > 0
                    ? `No claims affected — ${reclaimKeys.length} ${reclaimKeys.length === 1 ? "skyship returns" : "skyships return"} to the kingdom`
                    : outcome.total === 0
                      ? "No claims yet — these markers wait for a Land to link"
                      : "Chain doesn't reach yet — the markers stay and count toward finishing it later"}
            </Typography>
          </Box>
        )}
      </Box>
    </DecisionPanel>
  );
};

const Count = ({ Icon, value }: { Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; value: number }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
    <Icon size={13} style={{ color: tokens.ui.textMuted }} />
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.text, lineHeight: 1 }}>
      {value}
    </Typography>
  </Box>
);

export default RetrieveFleetsDialog;
