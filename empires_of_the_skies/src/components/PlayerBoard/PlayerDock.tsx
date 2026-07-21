/**
 * PlayerDock — the single player-economy dock at the bottom of the stable
 * frame, designed for its horizontal shape: one row of uniform "station"
 * cards — Kingdom | Forces & Musters | Fleets | Cards | Holdings.
 *
 * The local player's treasury lives in the PromptBar above (no duplicated
 * band here). Shows YOUR kingdom by default; clicking a rail chip swaps any
 * player's public board in (hidden hands stay hidden).
 */
import { memo, useState } from "react";
import { Box, Popover, Tooltip, Typography } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { tokens, backgrounds } from "@/theme";
import {
  IconRegiment, IconElite, IconLevy, IconSkyship,
  IconCathedral, IconPalace, IconFactory,
} from "@/theme";
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

import { Holdings } from "./Holdings";
import { KingdomActions } from "./board";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { CardLightbox, type EnlargedCard } from "@/components/atoms/CardLightbox";
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
          {!isSelf && (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, whiteSpace: "nowrap" }}>
              {viewInfo.resources.victoryPoints} VP · {viewInfo.resources.gold}g ·{" "}
              {viewInfo.hereticOrOrthodox === "heretic" ? "Heretic" : "Orthodox"}
            </Typography>
          )}
        </Box>
      </DockShell>
    );
  }

  return (
    <DockShell colour={colour} onToggle={() => setCollapsed(true)}>
      <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, flex: 1, minWidth: 0, height: "100%", overflowX: "auto", pb: "2px", pr: "30px" }}>
        {/* Kingdom — identity + allegiance (+ public treasury for opponents) */}
        <Station labelNode={<Identity viewInfo={viewInfo} isSelf={isSelf} />} minWidth={isSelf ? 170 : 200} grow={0}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <AllegiancePill viewInfo={viewInfo} />
            {(viewInfo.isArchprelate || viewInfo.isCaptainGeneral) && (
              <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, color: tokens.ui.gold, fontStyle: "italic", lineHeight: 1.3 }}>
                {[
                  viewInfo.isArchprelate && "Seat of the Archprelate",
                  viewInfo.isCaptainGeneral && "Captain-General of the Faith",
                ].filter(Boolean).join(" · ")}
              </Typography>
            )}
            {!isSelf && (
              <Box>
                <StatRow label="Victory Points" value={viewInfo.resources.victoryPoints} />
                <StatRow label="Gold" value={viewInfo.resources.gold} />
                <StatRow label="Counsellors" value={viewInfo.resources.counsellors} />
              </Box>
            )}
          </Box>
        </Station>

        <Station label="Forces & Musters" minWidth={260}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", mb: isSelf ? "8px" : 0 }}>
            <ForceChip Icon={IconRegiment} value={viewInfo.resources.regiments} label="Regiments" />
            <ForceChip Icon={IconElite} value={viewInfo.resources.eliteRegiments ?? 0} label="Elite" />
            <ForceChip Icon={IconLevy} value={viewInfo.resources.levies} label="Levies" />
            <ForceChip Icon={IconSkyship} value={viewInfo.resources.skyships} label="Skyships" />
          </Box>
          {isSelf && (
            <KingdomActions
              layout="row"
              colour={colour}
              shipyards={viewInfo.shipyards}
              counsellorLocations={viewInfo.playerBoardCounsellorLocations}
              moves={props.moves}
            />
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

        {isSelf ? (
          <Station label="Cards" minWidth={260}>
            <DockCards
              fortuneCards={viewInfo.resources.fortuneCards}
              legacyCard={viewInfo.resources.legacyCard}
              advantageCard={viewInfo.resources.advantageCard}
              eventCards={viewInfo.resources.eventCards}
              resolvedEvent={props.G.eventState.resolvedEvent}
              eventContributions={props.G.eventState.eventContributions}
              playerInfo={props.G.playerInfo}
            />
          </Station>
        ) : (
          <Station label="Cards" minWidth={200}>
            <PublicCards viewInfo={viewInfo} />
          </Station>
        )}

        <Station label="Holdings" minWidth={230}>
          {isSelf ? <Holdings {...props} variant="compact" /> : <PublicHoldings viewInfo={viewInfo} />}
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
  labelNode,
  action,
  minWidth,
  grow = 1,
  children,
}: {
  label?: string;
  labelNode?: React.ReactNode;
  action?: React.ReactNode;
  minWidth: number;
  grow?: number;
  children: React.ReactNode;
}) => (
  <Box
    sx={{
      minWidth,
      flex: `${grow} 1 ${grow === 0 ? "auto" : "0px"}`,
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
      {labelNode ?? (
        <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.gold, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
          {label}
        </Typography>
      )}
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

const AllegiancePill = ({ viewInfo }: { viewInfo: ViewInfo }) => {
  const isHeretic = viewInfo.hereticOrOrthodox === "heretic";
  const heresyVP = isHeretic ? viewInfo.heresyTracker : -viewInfo.heresyTracker;
  const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        px: `${tokens.spacing.sm}px`,
        height: 24,
        borderRadius: `${tokens.radius.pill}px`,
        background: backgrounds.surfaceGradient,
        border: `1px solid ${alColor}44`,
        alignSelf: "flex-start",
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: alColor, boxShadow: `0 0 4px ${alColor}88` }} />
      <Typography component="span" sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.body, fontWeight: 600, color: alColor, lineHeight: 1 }}>
        {isHeretic ? "Heretic" : "Orthodox"}
      </Typography>
      <Typography component="span" sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.body, fontWeight: 700, color: heresyVP >= 0 ? tokens.ui.success : tokens.ui.danger, lineHeight: 1 }}>
        {heresyVP > 0 ? "+" : ""}{heresyVP} VP
      </Typography>
    </Box>
  );
};

const ForceChip = ({
  Icon,
  value,
  label,
}: {
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  value: number;
  label: string;
}) => (
  <ResourceChip
    icon={<Icon style={{ fontSize: 15 }} />}
    value={value}
    label={label}
    size="sm"
    variant={value === 0 ? "muted" : "default"}
  />
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

const DockCards = ({
  fortuneCards,
  legacyCard,
  advantageCard,
  eventCards,
  resolvedEvent,
  eventContributions,
  playerInfo,
}: {
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  legacyCard: { name: string; colour: string } | undefined;
  advantageCard: string | undefined;
  eventCards: EventCardName[];
  resolvedEvent: EventCardName | null;
  eventContributions: Record<string, EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}) => {
  const [enlarged, setEnlarged] = useState<EnlargedCard | null>(null);
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
              const flipped = card.flipped;
              const text = !flipped ? "?" : card.sword > 0 ? `${card.sword}⚔` : card.shield > 0 ? `${card.shield}🛡` : "—";
              const title = card.sword > 0 ? `${card.sword} Swords` : card.shield > 0 ? `${card.shield} Shields` : "No Effect";
              return (
                <Box
                  key={i}
                  onClick={
                    flipped
                      ? () => setEnlarged({ src: getFoWCardImage(card), title, description: `⚔ ${card.sword}  🛡 ${card.shield}` })
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
            legacyCard
              ? () =>
                  setEnlarged({
                    src: LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()],
                    title: legacyCard.name,
                    description: legacyDef?.description,
                    colour: legacyCard.colour,
                  })
              : undefined
          }
        >
          {legacyCard ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: legacyColour, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, textTransform: "capitalize", lineHeight: 1.2 }}>
                {legacyCard.name}
              </Typography>
            </Box>
          ) : (
            <TileEmptyText>none yet</TileEmptyText>
          )}
        </CardTile>

        <CardTile
          label="Advantage"
          empty={!advantageCard}
          onClick={
            advantageCard
              ? () => setEnlarged({ src: KA_CARD_IMAGES[advantageCard], title: kaTitle ?? "", description: kaDef?.description })
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
            <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {eventCards.slice(0, 4).map((card, i) => {
                const def = EVENT_CARD_DEFS[card];
                const Icon = EVENT_ICONS[card];
                return Icon ? (
                  <Icon key={`${card}-${i}`} size={15} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.85 }} />
                ) : null;
              })}
            </Box>
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
            sx: {
              width: 320,
              maxHeight: 380,
              p: `${tokens.spacing.sm}px`,
              backgroundColor: tokens.ui.surface,
              border: `1px solid ${tokens.ui.borderMedium}`,
              borderRadius: `${tokens.radius.md}px`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            },
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

          {eventCards.length > 0 && (
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

      <CardLightbox card={enlarged} onClose={() => setEnlarged(null)} />
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

// Public (opponent) views

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.5 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1.5 }}>
      {value}
    </Typography>
  </Box>
);

const PublicHoldings = ({ viewInfo }: { viewInfo: ViewInfo }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: `${tokens.spacing.md}px` }}>
    <HoldingStat Icon={IconCathedral} label="Cathedrals" value={viewInfo.cathedrals} />
    <HoldingStat Icon={IconPalace} label="Palaces" value={viewInfo.palaces} />
    <HoldingStat Icon={IconSkyship} label="Shipyards" value={viewInfo.shipyards} />
    <HoldingStat Icon={IconFactory} label="Factories" value={viewInfo.factories} />
    <HoldingStat Icon={IconRegiment} label="Prisoners" value={viewInfo.prisoners} />
    <HoldingStat Icon={IconLevy} label="Dissenters" value={viewInfo.freeDissenters} />
  </Box>
);

const HoldingStat = ({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  value: number;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "5px", opacity: value === 0 ? 0.5 : 1, py: "2px" }}>
    <Icon style={{ fontSize: 14, color: tokens.ui.textMuted }} />
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1 }}>
      {label}
    </Typography>
  </Box>
);

const PublicCards = ({ viewInfo }: { viewInfo: ViewInfo }) => {
  const ka = viewInfo.resources.advantageCard;
  const kaName = ka ? (KA_CARD_DEFS[ka]?.displayName ?? ka) : "—";
  return (
    <Box>
      <StatRow label="Fortune of War" value={viewInfo.resources.fortuneCards.length} />
      <StatRow label="Event cards" value={viewInfo.resources.eventCards.length} />
      <StatRow label="Legacy" value={viewInfo.resources.legacyCard ? "hidden" : "—"} />
      <StatRow label="Advantage" value={kaName} />
    </Box>
  );
};
