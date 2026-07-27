/**
 * Trade — Anytime actions: sell skyships, sell buildings, propose deals,
 *         send agitators, set piracy intent.
 */
import { useMemo, useState } from "react";
import { Box, Typography, Slider, Button, Tooltip } from "@mui/material";
import { tokens, backgrounds } from "@/theme";
import { SectionHeader } from "@/components/atoms/SectionHeader";
import {
  MyGameProps,
  SKYSHIP_SELL_PRICE,
  BUILDING_SELL_PRICE,
  buildPlayerNetwork,
  bfsReachable,
  getPlayerBuildings,
  isBuildingConnected,
  FAITHDOM_TILES,
  GoodKey,
} from "@eots/game";
import { usePiracyIntent } from "@/contexts/PiracyIntentContext";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GoodsMarket } from "@/components/Stats/GoodsMarket";
import { getLocationPresentation } from "@/utils/locationLabels";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

type RouteStatus = {
  coords: number[];
  name: string;
  kind: "outpost" | "colony";
  connected: boolean;
  gold: number;
  goods: number;
};

/** Connectivity + expected trade income for each of the player's Lands. */
const useRouteStatuses = (props: MyGameProps): RouteStatus[] => {
  const { G, playerID } = props;
  return useMemo(() => {
    if (!playerID) return [];
    const tileArray = G.mapState.currentTileArray;
    const network = buildPlayerNetwork(G, playerID);
    const reachable = bfsReachable(FAITHDOM_TILES, network, tileArray);
    return getPlayerBuildings(G, playerID).map(([x, y]): RouteStatus => {
      const kind = G.mapState.buildings[y][x].buildings as "outpost" | "colony";
      const loot = tileArray[y][x].loot[kind];
      return {
        coords: [x, y],
        name: getLocationPresentation(tileArray, [x, y]).name,
        kind,
        connected: isBuildingConnected(x, y, reachable, tileArray),
        gold: loot.gold,
        goods: GOODS.reduce((sum, g) => sum + loot[g], 0),
      };
    });
  }, [G, playerID]);
};

// Compact action row

const CompactAction = ({
  label,
  price,
  disabled,
  disabledReason,
  onClick,
}: {
  label: string;
  price: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      ...backgrounds.actionSurface,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: `${tokens.spacing.md}px`,
      py: `${tokens.spacing.sm}px`,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: `all ${tokens.transition.fast}`,
      ...(!disabled && {
        "&:hover": {
          borderColor: `${tokens.ui.gold}66`,
          backgroundColor: tokens.ui.surfaceHover,
          "&::before": { background: backgrounds.goldAccentHover },
        },
        "&:active": { transform: "scale(0.99)" },
      }),
    }}
  >
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, fontWeight: 600, lineHeight: 1.2 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: disabled ? tokens.ui.textMuted : tokens.ui.gold, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", ml: 1 }}>
      {disabled && disabledReason ? disabledReason : price}
    </Typography>
  </Box>
);

// Main component

const Trade = (props: MyGameProps) => {
  const playerInfo = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const [sellSkyshipsOpen, setSellSkyshipsOpen] = useState(false);
  const [skyshipAmount, setSkyshipAmount] = useState(1);
  const [agitatorsOpen, setAgitatorsOpen] = useState(false);
  const [agitatorTarget, setAgitatorTarget] = useState<string | null>(null);

  const { intent: piracyIntent, setIntent } = usePiracyIntent();

  const skyships = playerInfo?.resources.skyships ?? 0;
  const cathedrals = playerInfo?.cathedrals ?? 0;
  const palaces = playerInfo?.palaces ?? 0;
  const isHeretic = playerInfo?.hereticOrOrthodox === "heretic";
  const gold = playerInfo?.resources.gold ?? 0;
  const hasFleets = (playerInfo?.fleetInfo ?? []).length > 0;

  const rivals = props.playerID
    ? Object.entries(props.G.playerInfo)
        .filter(([id]) => id !== props.playerID)
        .map(([id, p]) => ({ id, name: p.kingdomName, colour: p.colour }))
    : [];

  const agitatorsSentThisRound = playerInfo?.agitatorsSentThisRound ?? [];
  const freeDissenters = playerInfo?.freeDissenters ?? 0;
  const untargetedRivals = rivals.filter((r) => !agitatorsSentThisRound.includes(r.id));
  const allRivalsTargeted = rivals.length > 0 && untargetedRivals.length === 0;

  const routeStatuses = useRouteStatuses(props);

  return (
    <Box sx={{ p: `${tokens.spacing.md}px`, height: "100%", overflowY: "auto" }}>
      {/* Stacked, not three columns: three side-by-side lists needed ~700px and
          the panel is 560, which crushed Goods Value to a clipped sliver.
          Order follows use — check the market, read your network, then act. */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.lg}px` }}>
        {/* Goods market */}
        <Box>
          <SectionHeader label="Goods Market" sx={{ mb: "6px" }} />
          <GoodsMarket props={props} />
        </Box>

        {/* Anytime actions */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.xs}px` }}>
          <SectionHeader label="Anytime Actions" sx={{ mb: "6px" }} />

          {skyships > 0 && (
            <CompactAction
              label={`Sell Skyships (${skyships})`}
              price={`${SKYSHIP_SELL_PRICE}g each`}
              onClick={() => { setSkyshipAmount(1); setSellSkyshipsOpen(true); }}
            />
          )}

          {isHeretic && cathedrals > 0 && (
            <CompactAction
              label={`Sell Cathedral (${cathedrals})`}
              price={`${BUILDING_SELL_PRICE}g`}
              onClick={() => props.moves.sellBuilding("cathedral")}
            />
          )}

          {palaces > 1 && (
            <CompactAction
              label={`Sell Palace (${palaces})`}
              price={`${BUILDING_SELL_PRICE}g`}
              onClick={() => props.moves.sellBuilding("palace")}
            />
          )}

          {(gold >= 2 || allRivalsTargeted) && (
            <>
              <CompactAction
                label="Send Agitators"
                price="2g"
                disabled={allRivalsTargeted}
                disabledReason="All sent this round"
                onClick={() => { setAgitatorTarget(null); setAgitatorsOpen(true); }}
              />
              {freeDissenters > 0 && (
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 12,
                    color: tokens.ui.danger,
                    fontWeight: 600,
                    pl: `${tokens.spacing.xs}px`,
                    lineHeight: 1.3,
                  }}
                >
                  {freeDissenters} free dissenter{freeDissenters !== 1 ? "s" : ""} active
                </Typography>
              )}
            </>
          )}

          {hasFleets && (
            <Box sx={{ mt: `${tokens.spacing.xs}px` }}>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mb: "4px" }}>
                When your fleets reach a rival's trade route:
              </Typography>
              <Box sx={{ display: "flex", gap: "6px" }}>
                {([
                  { key: "tax" as const, label: "Tax it", hint: "Take the gold and leave the route standing" },
                  { key: "cut" as const, label: "Cut it", hint: "Destroy the route skyship — no gold, but their trade and factories suffer" },
                ]).map(({ key, label, hint }) => {
                  const active = piracyIntent === key;
                  return (
                    <Tooltip key={key} title={hint} placement="top" arrow>
                      <Box
                        onClick={() => setIntent(key)}
                        sx={{
                          flex: 1,
                          px: `${tokens.spacing.sm}px`,
                          py: `${tokens.spacing.xs}px`,
                          textAlign: "center",
                          borderRadius: `${tokens.radius.sm}px`,
                          cursor: "pointer",
                          border: `1px solid ${active ? tokens.ui.gold : tokens.ui.border}`,
                          backgroundColor: active ? `${tokens.ui.gold}18` : tokens.ui.surface,
                          boxShadow: active ? `inset 0 0 0 1px ${tokens.ui.gold}44` : "none",
                          transition: `all ${tokens.transition.fast}`,
                          "&:hover": { borderColor: `${tokens.ui.gold}88` },
                        }}
                      >
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, fontWeight: active ? 700 : 500, color: active ? tokens.ui.gold : tokens.ui.textMuted, lineHeight: 1.2 }}>
                          {label}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        {/* Trade routes */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.xs}px` }}>
          <SectionHeader label="Trade Routes" sx={{ mb: "6px" }} />
          {routeStatuses.map((r) => (
            <Tooltip
              key={`${r.coords[0]}-${r.coords[1]}`}
              title={
                r.connected
                  ? `Connected to Faithdom — earns ${r.gold} Gold and ${r.goods} Goods at trade resolution`
                  : "Not connected — place route skyships (when retrieving a fleet) to link this Land to Faithdom, or it earns nothing"
              }
              placement="top"
              arrow
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: `${tokens.spacing.sm}px`,
                  py: `${tokens.spacing.xs + 1}px`,
                  borderRadius: `${tokens.radius.sm}px`,
                  border: `1px solid ${r.connected ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.35)"}`,
                  backgroundColor: tokens.ui.surface,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, fontWeight: 600, lineHeight: 1.2 }}>
                    {r.name}
                  </Typography>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
                    {r.kind === "colony" ? "Colony" : "Outpost"} · {r.gold}g + {r.goods} goods
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: r.connected ? "#4ade80" : "#ef4444", whiteSpace: "nowrap" }}>
                  {r.connected ? "✓ Linked" : "✗ No route"}
                </Typography>
              </Box>
            </Tooltip>
          ))}
          {routeStatuses.length === 0 && (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.textMuted, fontStyle: "italic" }}>
              No outposts or colonies yet — claim Lands to start trading.
            </Typography>
          )}
        </Box>

      </Box>

      {/* Sell Skyships dialog */}
      <DialogShell
        open={sellSkyshipsOpen}
        title="Sell Skyships"
        mood="peacetime"
        size="xs"
        confirmLabel={`Sell ${skyshipAmount} for ${skyshipAmount * SKYSHIP_SELL_PRICE}g`}
        onConfirm={() => {
          props.moves.sellSkyships(skyshipAmount);
          setSellSkyshipsOpen(false);
        }}
        cancelLabel="Cancel"
        onCancel={() => setSellSkyshipsOpen(false)}
      >
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text, mb: 2 }}>
          How many skyships to sell? ({skyships} available)
        </Typography>
        <Slider
          value={skyshipAmount}
          onChange={(_, v) => setSkyshipAmount(v as number)}
          min={1}
          max={Math.max(skyships, 1)}
          step={1}
          marks
          valueLabelDisplay="auto"
          sx={{ color: tokens.ui.gold }}
        />
      </DialogShell>

      {/* Send Agitators dialog */}
      <DialogShell
        open={agitatorsOpen}
        title="Send Agitators"
        mood="crisis"
        size="xs"
        confirmLabel="Send (−2g)"
        confirmDisabled={!agitatorTarget}
        onConfirm={() => {
          if (agitatorTarget) {
            props.moves.sendAgitators(agitatorTarget);
            setAgitatorsOpen(false);
          }
        }}
        cancelLabel="Cancel"
        onCancel={() => setAgitatorsOpen(false)}
      >
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text, mb: 2 }}>
          Choose a rival to place a free dissenter on:
        </Typography>
        <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {rivals.map((r) => {
            const alreadySent = agitatorsSentThisRound.includes(r.id);
            return (
              <Button
                key={r.id}
                disabled={alreadySent}
                onClick={() => setAgitatorTarget(r.id)}
                sx={{
                  backgroundColor: r.colour,
                  border: agitatorTarget === r.id ? "2px solid black" : "none",
                  color: "#000",
                  textTransform: "none",
                  fontWeight: 600,
                  opacity: alreadySent ? 0.4 : 1,
                  "&:hover": { backgroundColor: r.colour, opacity: alreadySent ? 0.4 : 0.85 },
                  "&.Mui-disabled": { backgroundColor: r.colour, color: "#000" },
                }}
              >
                {r.name}{alreadySent ? " (Sent)" : ""}
              </Button>
            );
          })}
        </Box>
      </DialogShell>
    </Box>
  );
};

export default Trade;
