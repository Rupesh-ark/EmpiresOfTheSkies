/**
 * PlayerDock — the hand-and-actions tray at the bottom of the stable
 * frame: Cards || Musters | Fleets, one silhouette for every viewed
 * player. Slow reference info lives on the rail (standings, Holdings,
 * Forces); treasury lives in the PromptBar — the dock never duplicates
 * them. Hidden hands stay hidden when inspecting opponents.
 */
import { memo, useState } from "react";
import { Box, Popover, Tooltip, Typography } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { tokens, backgrounds } from "@/theme";
import { GiAnchor } from "react-icons/gi";
import {
  MyGameProps, KINGDOM_LOCATION, findPossibleDestinations, FleetInfo,
  KA_CARD_DEFS, LEGACY_CARD_DEFS, EVENT_CARD_DEFS, PlayerFortuneOfWarCardInfo, EventCardName,
} from "@eots/game";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.webp";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.webp";
import { SWORD_CARDS, SHIELD_CARDS, NO_EFFECT_CARD } from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";
import { EVENT_ICONS } from "@/components/Events/eventCardIcons";

import { KingdomActions } from "./board";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";
import { useMapSelection } from "@/contexts/MapSelectionContext";
import { FleetTransferDialog } from "@/components/WorldMap/FleetTransferDialog";

interface PlayerDockProps extends MyGameProps {
  /** Player whose board the dock shows (rail selection); defaults to self */
  viewPlayerID: string;
  onOpenFleetLocation?: (location: number[]) => void;
}

const DOCK_HEIGHT = 176;
type ViewInfo = MyGameProps["G"]["playerInfo"][string];

export const PlayerDock = memo((props: PlayerDockProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [manageFleetsOpen, setManageFleetsOpen] = useState(false);
  const { startSelection } = useMapSelection();

  const viewInfo = props.G.playerInfo[props.viewPlayerID];
  const isSelf = props.playerID === props.viewPlayerID;
  if (!viewInfo) return null;

  const colour = viewInfo.colour;

  const [homeX, homeY] = KINGDOM_LOCATION;
  const homeFleets = viewInfo.fleetInfo.filter(
    (f) => f.location[0] === homeX && f.location[1] === homeY
  );
  const isMyActionsTurn =
    isSelf &&
    props.G.stage.phase === "actions" &&
    props.ctx.currentPlayer === props.playerID;
  const deployableFleetIds = isMyActionsTurn
    ? viewInfo.fleetInfo.filter((f) => f.skyships > 0 && !f.dispatchedThisRound).map((f) => f.fleetId)
    : [];

  const handleDeploy = (fleetId: number) => {
    const fleetIndex = viewInfo.fleetInfo.findIndex((f) => f.fleetId === fleetId);
    const fleet = viewInfo.fleetInfo[fleetIndex];
    if (!fleet) return;

    const isLaden = fleet.regiments > 0 || fleet.levies > 0 || fleet.eliteRegiments > 0;
    const [allDests, within1, within2, within3] = findPossibleDestinations(props.G, fleet.location, !isLaden);
    const costMap = new Map<string, number>();
    for (const [x, y] of within3) costMap.set(`${x},${y}`, 3);
    for (const [x, y] of within2) costMap.set(`${x},${y}`, 2);
    for (const [x, y] of within1) costMap.set(`${x},${y}`, 1);

    startSelection({
      tiles: allDests,
      prompt: `Deploy Fleet ${fleetId + 1} — pick a highlighted destination on the map`,
      confirmLabel: "Deploy",
      getSelectionDetail: (coords) => `(${costMap.get(`${coords[0]},${coords[1]}`) ?? 1}g)`,
      onConfirm: (coords) => props.moves.moveFleet(fleetIndex, coords),
      onCancel: () => {},
    });
  };

  if (collapsed) {
    return (
      <DockShell colour={colour} collapsed onToggle={() => setCollapsed(false)}>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.md}px`, minWidth: 0 }}>
          <Identity viewInfo={viewInfo} isSelf={isSelf} />
        </Box>
      </DockShell>
    );
  }

  return (
    <DockShell colour={colour} onToggle={() => setCollapsed(true)}>
      {/* One silhouette for every player — cycling the rail changes the
          numbers, never the geometry. Information stations left, action
          stations right of the divider, under the Confirm corner. */}
      <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, flex: 1, minWidth: 0, height: "100%", overflowX: "auto", pb: "2px", pr: "30px" }}>
        <Station label="Cards" minWidth={250}>
          <DockCards
            publicView={!isSelf}
            fortuneCards={viewInfo.resources.fortuneCards}
            legacyCard={viewInfo.resources.legacyCard}
            advantageCard={viewInfo.resources.advantageCard}
            eventCards={viewInfo.resources.eventCards}
            resolvedEvent={props.G.eventState.resolvedEvent}
            eventContributions={props.G.eventState.eventContributions}
            playerInfo={props.G.playerInfo}
          />
        </Station>

        {/* Divider: information | actions */}
        <Box
          sx={{
            width: "2px",
            alignSelf: "stretch",
            my: "4px",
            flexShrink: 0,
            background: `linear-gradient(180deg, transparent, ${tokens.ui.gold}55, transparent)`,
          }}
        />

        <Station label="Musters" minWidth={200}>
          {isSelf ? (
            <KingdomActions
              layout="row"
              colour={colour}
              shipyards={viewInfo.shipyards}
              counsellorLocations={viewInfo.playerBoardCounsellorLocations}
              moves={props.moves}
            />
          ) : (
            <MustersStatus colour={colour} shipyards={viewInfo.shipyards} counsellorLocations={viewInfo.playerBoardCounsellorLocations} />
          )}
        </Station>

        <Station
          label="Fleets"
          minWidth={300}
          action={
            isSelf && homeFleets.length > 0 ? (
              <GameButton variant="ghost" size="sm" onClick={() => setManageFleetsOpen(true)}>
                Manage
              </GameButton>
            ) : undefined
          }
        >
          <FleetStrip
            fleets={viewInfo.fleetInfo}
            tileMap={props.G.mapState.currentTileArray}
            deployableFleetIds={deployableFleetIds}
            onDeploy={isMyActionsTurn ? handleDeploy : undefined}
            onViewLocation={props.onOpenFleetLocation}
          />
        </Station>
      </Box>

      {isSelf && homeFleets.length > 0 && (
        <FleetTransferDialog
          open={manageFleetsOpen}
          onClose={() => setManageFleetsOpen(false)}
          location={[homeX, homeY]}
          fleets={homeFleets}
          reserves={viewInfo.resources}
          isKingdom
          garrison={null}
          tileArray={props.G.mapState.currentTileArray}
          moves={props.moves}
        />
      )}
    </DockShell>
  );
});

// Shell

const DockShell = ({
  colour,
  collapsed = false,
  onToggle,
  children,
}: {
  colour: string;
  collapsed?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: collapsed ? "center" : "stretch",
      height: collapsed ? 38 : DOCK_HEIGHT,
      flexShrink: 0,
      px: `${tokens.spacing.sm}px`,
      py: collapsed ? 0 : `${tokens.spacing.xs}px`,
      borderTop: `3px solid ${colour}`,
      background: backgrounds.parchmentPanelTinted,
      backgroundColor: tokens.ui.background,
      boxShadow: "inset 0 6px 10px -6px rgba(0,0,0,0.25)",
      transition: `height ${tokens.transition.normal}`,
      position: "relative",
    }}
  >
    {children}
    <Tooltip title={collapsed ? "Expand the board" : "Collapse"} placement="top">
      <Box
        onClick={onToggle}
        sx={{
          position: "absolute",
          top: collapsed ? "50%" : 8,
          right: 8,
          transform: collapsed ? "translateY(-50%)" : "none",
          display: "flex",
          alignItems: "center",
          color: tokens.ui.textMuted,
          cursor: "pointer",
          zIndex: 5,
          "&:hover": { color: tokens.ui.text },
        }}
      >
        {collapsed ? <ExpandLess /> : <ExpandMore />}
      </Box>
    </Tooltip>
  </Box>
);

/** Uniform bordered station card with a small-caps header */
const Station = ({
  label,
  action,
  minWidth,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  minWidth: number;
  children: React.ReactNode;
}) => (
  <Box
    sx={{
      minWidth,
      flex: "1 1 0",
      maxWidth: minWidth * 1.6,
      display: "flex",
      flexDirection: "column",
      borderRadius: `${tokens.radius.md}px`,
      border: `1px solid ${tokens.ui.border}`,
      borderTop: `1px solid ${tokens.ui.gold}22`,
      background: backgrounds.surfaceGradient,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 3px rgba(80,60,30,0.10)`,
      px: `${tokens.spacing.sm}px`,
      py: `${tokens.spacing.xs}px`,
      overflow: "hidden",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "4px", flexShrink: 0, minHeight: 22 }}>
      <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.gold, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
        {label}
      </Typography>
      {action}
    </Box>
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { background: tokens.ui.surfaceHover, borderRadius: 3 } }}>
      {children}
    </Box>
  </Box>
);

const Identity = ({ viewInfo, isSelf }: { viewInfo: ViewInfo; isSelf: boolean }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, minWidth: 0, flexShrink: 0 }}>
    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: viewInfo.colour, boxShadow: `0 0 6px ${viewInfo.colour}66`, flexShrink: 0 }} />
    <Typography
      noWrap
      sx={{
        fontFamily: tokens.font.display,
        fontSize: tokens.fontSize.md,
        color: viewInfo.colour,
        lineHeight: 1.2,
        textShadow: `0 1px 2px rgba(0,0,0,0.35)`,
      }}
    >
      {viewInfo.kingdomName}
      {isSelf ? " (you)" : ""}
    </Typography>
    {viewInfo.isArchprelate && (
      <Tooltip title="Seat of the Archprelate" placement="top" arrow>
        <Box component="img" src={popeLogo} alt="Archprelate" sx={{ width: 22, height: 22, objectFit: "contain", opacity: 0.85 }} />
      </Tooltip>
    )}
    {viewInfo.isCaptainGeneral && (
      <Tooltip title="Captain-General of the Faith" placement="top" arrow>
        <Box component="img" src={captainGeneralLogo} alt="Captain-General" sx={{ width: 22, height: 22, objectFit: "contain", opacity: 0.85 }} />
      </Tooltip>
    )}
  </Box>
);

/** Opponent view of the Musters station — same slot, read-only round status. */
const MustersStatus = ({
  colour,
  shipyards,
  counsellorLocations,
}: {
  colour: string;
  shipyards: number;
  counsellorLocations: { buildSkyships: boolean; conscriptLevies: boolean; trainTroops: boolean };
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
    {[
      { label: `Build skyships (${shipyards} ${shipyards === 1 ? "yard" : "yards"})`, done: counsellorLocations.buildSkyships },
      { label: "Conscript levies", done: counsellorLocations.conscriptLevies },
      { label: "Train troops", done: counsellorLocations.trainTroops },
    ].map(({ label, done }) => (
      <Box key={label} sx={{ display: "flex", alignItems: "center", gap: "6px", opacity: done ? 1 : 0.55 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor: done ? colour : "transparent",
            border: done ? "none" : `1.5px solid ${tokens.ui.textMuted}`,
            boxShadow: done ? `0 0 4px ${colour}88` : "none",
          }}
        />
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, lineHeight: 1.3, flex: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontStyle: "italic", color: done ? tokens.ui.text : tokens.ui.textMuted, lineHeight: 1.3 }}>
          {done ? "done" : "—"}
        </Typography>
      </Box>
    ))}
  </Box>
);


// Fleets — horizontal mini-cards built for the dock

const FleetStrip = ({
  fleets,
  tileMap,
  deployableFleetIds,
  onDeploy,
  onViewLocation,
}: {
  fleets: FleetInfo[];
  tileMap: MyGameProps["G"]["mapState"]["currentTileArray"];
  deployableFleetIds: number[];
  onDeploy?: (fleetId: number) => void;
  onViewLocation?: (location: number[]) => void;
}) => (
  <Box sx={{ display: "flex", gap: "6px", height: "100%", alignItems: "stretch" }}>
    {fleets.map((fleet) => {
      const atHome = fleet.location[0] === KINGDOM_LOCATION[0] && fleet.location[1] === KINGDOM_LOCATION[1];
      const isEmpty = fleet.skyships === 0;
      const placeName = atHome ? "Home Waters" : getLocationPresentation(tileMap, fleet.location).name;
      const canDeploy = !!onDeploy && deployableFleetIds.includes(fleet.fleetId);

      return (
        <Box
          key={fleet.fleetId}
          onClick={onViewLocation ? () => onViewLocation(fleet.location) : undefined}
          sx={{
            flex: "1 1 0",
            minWidth: 84,
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            p: "6px",
            borderRadius: `${tokens.radius.sm}px`,
            border: `1px solid ${tokens.ui.border}`,
            backgroundColor: isEmpty ? `${tokens.ui.surface}88` : tokens.ui.surfaceRaised,
            opacity: isEmpty ? 0.75 : 1,
            cursor: onViewLocation ? "pointer" : "default",
            transition: `all ${tokens.transition.fast}`,
            "&:hover": onViewLocation ? { borderColor: `${tokens.ui.gold}55` } : undefined,
          }}
        >
          <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1 }}>
            Fleet {fleet.fleetId + 1}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "3px", minWidth: 0 }}>
            <GiAnchor size={11} color={tokens.ui.textMuted} />
            <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1 }}>
              {placeName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "7px", mt: "1px" }}>
            <LoadoutStat Icon={IconSkyship} value={fleet.skyships} />
            <LoadoutStat Icon={IconRegiment} value={fleet.regiments + (fleet.eliteRegiments ?? 0)} />
            <LoadoutStat Icon={IconLevy} value={fleet.levies} />
          </Box>
          <Box sx={{ mt: "auto" }}>
            {canDeploy ? (
              <GameButton
                variant="secondary"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  onDeploy!(fleet.fleetId);
                }}
              >
                Deploy
              </GameButton>
            ) : (
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", lineHeight: 1, textAlign: "right" }}>
                {isEmpty ? "empty" : fleet.dispatchedThisRound ? "dispatched" : atHome ? "at home" : "deployed"}
              </Typography>
            )}
          </Box>
        </Box>
      );
    })}
  </Box>
);

const LoadoutStat = ({
  Icon,
  value,
}: {
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  value: number;
}) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
    <Icon style={{ fontSize: 13, color: value > 0 ? tokens.ui.text : tokens.ui.textMuted }} />
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: value > 0 ? tokens.ui.text : tokens.ui.textMuted, lineHeight: 1 }}>
      {value}
    </Typography>
  </Box>
);

// Cards — flat 2×2 category grid built for the dock's height.
// Full art opens in the lightbox on click (no drawers, no cropped images).

const getFoWCardImage = (card: PlayerFortuneOfWarCardInfo): string => {
  if (card.sword > 0) return SWORD_CARDS[card.sword] ?? NO_EFFECT_CARD;
  if (card.shield > 0) return SHIELD_CARDS[card.shield] ?? NO_EFFECT_CARD;
  return NO_EFFECT_CARD;
};

interface CardPreview {
  src: string;
  title: string;
  description?: string;
  /** Legacy card allegiance colour ("purple" | "orange") */
  colour?: string;
}

/** Shared parchment chrome for dock popovers */
const POPOVER_PAPER_SX = {
  backgroundColor: tokens.ui.surface,
  border: `1px solid ${tokens.ui.borderMedium}`,
  borderRadius: `${tokens.radius.md}px`,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
} as const;

const DockCards = ({
  publicView = false,
  fortuneCards,
  legacyCard,
  advantageCard,
  eventCards,
  resolvedEvent,
  eventContributions,
  playerInfo,
}: {
  /** Another player's board: hidden hands stay hidden, layout stays identical */
  publicView?: boolean;
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  legacyCard: { name: string; colour: string } | undefined;
  advantageCard: string | undefined;
  eventCards: EventCardName[];
  resolvedEvent: EventCardName | null;
  eventContributions: Record<string, EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}) => {
  const [cardPreview, setCardPreview] = useState<{ anchor: HTMLElement; card: CardPreview } | null>(null);
  const [eventsAnchor, setEventsAnchor] = useState<HTMLElement | null>(null);

  const resolvedDef = resolvedEvent ? EVENT_CARD_DEFS[resolvedEvent] : null;
  const hasEventInfo = eventCards.length > 0 || resolvedEvent !== null || Object.keys(eventContributions).length > 0;

  const legacyDef = legacyCard
    ? LEGACY_CARD_DEFS[legacyCard.name.toLowerCase() as keyof typeof LEGACY_CARD_DEFS]
    : undefined;
  const kaDef = advantageCard ? KA_CARD_DEFS[advantageCard as keyof typeof KA_CARD_DEFS] : undefined;
  const kaTitle = kaDef?.displayName ?? advantageCard?.replace(/_/g, " ");
  const legacyColour = legacyCard?.colour === "purple" ? tokens.allegiance.orthodox : tokens.allegiance.heresy;

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", height: "100%", alignContent: "stretch" }}>
        <CardTile label={`Fortune of War · ${fortuneCards.length}`} empty={fortuneCards.length === 0}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            {fortuneCards.map((card, i) => {
              const flipped = card.flipped && !publicView;
              const text = !flipped ? "?" : card.sword > 0 ? `${card.sword}⚔` : card.shield > 0 ? `${card.shield}🛡` : "—";
              const title = card.sword > 0 ? `${card.sword} Swords` : card.shield > 0 ? `${card.shield} Shields` : "No Effect";
              return (
                <Box
                  key={i}
                  onClick={
                    flipped
                      ? (e) =>
                          setCardPreview({
                            anchor: e.currentTarget,
                            card: { src: getFoWCardImage(card), title, description: `⚔ ${card.sword}  🛡 ${card.shield}` },
                          })
                      : undefined
                  }
                  sx={{
                    px: "6px",
                    py: "2px",
                    borderRadius: `${tokens.radius.sm}px`,
                    border: `1px solid ${flipped ? (card.sword > 0 ? "#c6282866" : "#1565c066") : tokens.ui.border}`,
                    backgroundColor: tokens.ui.surfaceRaised,
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: flipped ? tokens.ui.text : tokens.ui.textMuted,
                    cursor: flipped ? "pointer" : "default",
                    "&:hover": flipped ? { borderColor: tokens.ui.gold } : undefined,
                  }}
                >
                  {text}
                </Box>
              );
            })}
          </Box>
        </CardTile>

        <CardTile
          label="Legacy"
          empty={!legacyCard}
          onClick={
            legacyCard && !publicView
              ? (e) =>
                  setCardPreview({
                    anchor: e.currentTarget,
                    card: {
                      src: LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()],
                      title: legacyCard.name,
                      description: legacyDef?.description,
                      colour: legacyCard.colour,
                    },
                  })
              : undefined
          }
        >
          {legacyCard ? (
            publicView ? (
              <TileEmptyText>hidden until scored</TileEmptyText>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: legacyColour, flexShrink: 0 }} />
                <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, textTransform: "capitalize", lineHeight: 1.2 }}>
                  {legacyCard.name}
                </Typography>
              </Box>
            )
          ) : (
            <TileEmptyText>none yet</TileEmptyText>
          )}
        </CardTile>

        <CardTile
          label="Advantage"
          empty={!advantageCard}
          onClick={
            advantageCard
              ? (e) =>
                  setCardPreview({
                    anchor: e.currentTarget,
                    card: { src: KA_CARD_IMAGES[advantageCard], title: kaTitle ?? "", description: kaDef?.description },
                  })
              : undefined
          }
        >
          {advantageCard ? (
            <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, textTransform: "capitalize", lineHeight: 1.2 }}>
              {kaTitle}
            </Typography>
          ) : (
            <TileEmptyText>none yet</TileEmptyText>
          )}
        </CardTile>

        <CardTile
          label={`Events · ${eventCards.length} in hand`}
          empty={!hasEventInfo}
          onClick={hasEventInfo ? (e) => setEventsAnchor(e.currentTarget) : undefined}
        >
          {resolvedDef ? (
            // This round's resolved event is the ambient fact worth a glance.
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
              <Typography sx={{ fontSize: tokens.fontSize.xs, color: tokens.ui.gold, lineHeight: 1, flexShrink: 0 }}>★</Typography>
              <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.gold, lineHeight: 1.2 }}>
                {resolvedDef.displayName}
              </Typography>
            </Box>
          ) : eventCards.length > 0 ? (
            publicView ? (
              <TileEmptyText>hand hidden</TileEmptyText>
            ) : (
              <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {eventCards.slice(0, 4).map((card, i) => {
                  const def = EVENT_CARD_DEFS[card];
                  const Icon = EVENT_ICONS[card];
                  return Icon ? (
                    <Icon key={`${card}-${i}`} size={15} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.85 }} />
                  ) : null;
                })}
              </Box>
            )
          ) : (
            <TileEmptyText>hand empty</TileEmptyText>
          )}
        </CardTile>
      </Box>

      {/* Events detail — resolved event, everyone's chosen cards, your hand */}
      <Popover
        open={eventsAnchor !== null}
        anchorEl={eventsAnchor}
        onClose={() => setEventsAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: { ...POPOVER_PAPER_SX, width: 320, maxHeight: 380, p: `${tokens.spacing.sm}px` },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {resolvedDef && resolvedEvent && (() => {
            const Icon = EVENT_ICONS[resolvedEvent];
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, px: `${tokens.spacing.sm}px`, py: `${tokens.spacing.xs + 2}px`, borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.gold}55`, background: `linear-gradient(135deg, ${tokens.ui.gold}12 0%, transparent 100%)` }}>
                <Box sx={{ width: 32, height: 32, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `radial-gradient(circle, ${tokens.ui.gold}25 0%, transparent 70%)` }}>
                  {Icon && <Icon size={18} color={tokens.ui.gold} style={{ opacity: 0.9 }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
                    Resolved this round
                  </Typography>
                  <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.gold, lineHeight: 1.2 }}>
                    {resolvedDef.displayName}
                  </Typography>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.3, mt: "1px" }}>
                    {resolvedDef.description}
                  </Typography>
                </Box>
              </Box>
            );
          })()}

          {Object.keys(eventContributions).length > 0 && (
            <>
              <PopoverSectionLabel>Chosen Cards</PopoverSectionLabel>
              {Object.entries(eventContributions).map(([pid, card]) => {
                const def = EVENT_CARD_DEFS[card];
                const Icon = EVENT_ICONS[card];
                const player = playerInfo[pid];
                const isResolved = card === resolvedEvent;
                return (
                  <Box key={pid} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${isResolved ? `${tokens.ui.gold}44` : tokens.ui.border}`, backgroundColor: isResolved ? `${tokens.ui.gold}08` : tokens.ui.surfaceRaised }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: player?.colour, flexShrink: 0, boxShadow: `0 0 4px ${player?.colour}66` }} />
                    {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7, flexShrink: 0 }} />}
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                      {def.displayName}
                    </Typography>
                    {isResolved && (
                      <Typography sx={{ fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.gold, flexShrink: 0 }}>★</Typography>
                    )}
                  </Box>
                );
              })}
            </>
          )}

          {eventCards.length > 0 && !publicView && (
            <>
              <PopoverSectionLabel>Your Hand</PopoverSectionLabel>
              {eventCards.map((card, i) => {
                const def = EVENT_CARD_DEFS[card];
                const Icon = EVENT_ICONS[card];
                return (
                  <Box key={`${card}-${i}`} sx={{ display: "flex", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.border}`, backgroundColor: tokens.ui.surfaceRaised }}>
                    {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7, flexShrink: 0, marginTop: 2 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.text, lineHeight: 1.2 }}>
                        {def.displayName}
                        {def.isBattle ? "  ⚔" : ""}
                      </Typography>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.3 }}>
                        {def.effect}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      </Popover>

      {/* Card preview — information first: thumbnail beside name, allegiance,
          and rules text. Compact enough to always fit above the dock. */}
      <Popover
        open={cardPreview !== null}
        anchorEl={cardPreview?.anchor ?? null}
        onClose={() => setCardPreview(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: { sx: { ...POPOVER_PAPER_SX, width: 400, p: `${tokens.spacing.sm}px` } },
        }}
      >
        {cardPreview && (
          <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, alignItems: "stretch" }}>
            <Box
              component="img"
              src={cardPreview.card.src}
              alt={cardPreview.card.title}
              sx={{
                width: 104,
                height: 148,
                objectFit: "cover",
                objectPosition: "top",
                borderRadius: `${tokens.radius.sm}px`,
                border: `1px solid ${tokens.ui.borderMedium}`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                flexShrink: 0,
                alignSelf: "flex-start",
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.md, color: tokens.ui.textBright, textTransform: "capitalize", lineHeight: 1.2 }}>
                {cardPreview.card.title}
              </Typography>
              {cardPreview.card.colour && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      backgroundColor: cardPreview.card.colour === "purple" ? tokens.allegiance.orthodox : tokens.allegiance.heresy,
                    }}
                  />
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: cardPreview.card.colour === "purple" ? tokens.allegiance.orthodox : tokens.allegiance.heresy, lineHeight: 1.3 }}>
                    {cardPreview.card.colour === "purple"
                      ? "Orthodox — full VP if Orthodox, half if Heretic"
                      : "Heretic — full VP if Heretic, half if Orthodox"}
                  </Typography>
                </Box>
              )}
              {cardPreview.card.description && (
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text, lineHeight: 1.45 }}>
                  {cardPreview.card.description}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Popover>
    </>
  );
};

const PopoverSectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
    {children}
  </Typography>
);

const CardTile = ({
  label,
  empty = false,
  onClick,
  children,
}: {
  label: string;
  empty?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      px: "7px",
      py: "5px",
      minWidth: 0,
      borderRadius: `${tokens.radius.sm}px`,
      border: `1px solid ${tokens.ui.border}`,
      backgroundColor: tokens.ui.surfaceRaised,
      opacity: empty ? 0.6 : 1,
      cursor: onClick ? "pointer" : "default",
      transition: `all ${tokens.transition.fast}`,
      "&:hover": onClick ? { borderColor: `${tokens.ui.gold}88`, boxShadow: `0 0 6px ${tokens.ui.gold}22` } : undefined,
    }}
  >
    <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>{children}</Box>
  </Box>
);

const TileEmptyText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", lineHeight: 1.2 }}>
    {children}
  </Typography>
);





