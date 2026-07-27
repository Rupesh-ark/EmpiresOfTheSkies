/**
 * PlayerDock — your hand, and only your hand. Musters and Fleets moved to
 * the action column (they're actions); Holdings and Forces sit beside the
 * controls they inform; treasury lives in the PromptBar. What's left is
 * cards, which are always yours — a tray with buttons on it must never
 * quietly become someone else's.
 */
import { memo, useState } from "react";
import { Box, Popover, Tooltip, Typography } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { GiCrane } from "react-icons/gi";
import { tokens, backgrounds } from "@/theme";
import {
  MyGameProps, KINGDOM_LOCATION, findPossibleDestinations, phaseGroup,
  KA_CARD_DEFS, LEGACY_CARD_DEFS, EVENT_CARD_DEFS, PlayerFortuneOfWarCardInfo, EventCardName, FOW_HAND_MAX,
  MAX_SHIPYARDS,
} from "@eots/game";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.webp";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.webp";
import { SWORD_CARDS, SHIELD_CARDS, NO_EFFECT_CARD, FOW_CARD_BACK } from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";
import { EVENT_ICONS } from "@/components/Events/eventCardIcons";

import { FleetStrip } from "./KingdomStations";
import { SectionHeader } from "@/components/atoms/SectionHeader";
import { KingdomActions } from "./board";
import { GameButton } from "@/components/atoms/GameButton";
import { useMapSelection } from "@/contexts/MapSelectionContext";
import { FleetTransferDialog } from "@/components/WorldMap/FleetTransferDialog";

interface PlayerDockProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
}

const DOCK_HEIGHT = 140;
/** Portrait face sized to the dock's height at roughly 5:7 */
const CARD_W = 70;
type ViewInfo = MyGameProps["G"]["playerInfo"][string];

export const PlayerDock = memo((props: PlayerDockProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [manageFleetsOpen, setManageFleetsOpen] = useState(false);
  const { startSelection } = useMapSelection();

  const me = props.playerID;
  const viewInfo = me ? props.G.playerInfo[me] : undefined;

  const [homeX, homeY] = KINGDOM_LOCATION;
  const homeFleets = (viewInfo?.fleetInfo ?? []).filter((f) => f.location[0] === homeX && f.location[1] === homeY);
  const isMyActionsTurn =
    !!me && phaseGroup(props.ctx.phase!) === "actions" && props.ctx.currentPlayer === me;
  const deployableFleetIds =
    isMyActionsTurn && viewInfo
      ? viewInfo.fleetInfo.filter((f) => f.skyships > 0 && !f.dispatchedThisRound).map((f) => f.fleetId)
      : [];

  const handleDeploy = (fleetId: number) => {
    if (!viewInfo) return;
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

  if (!me || !viewInfo) return null;

  const colour = viewInfo.colour;

  if (collapsed) {
    return (
      <DockShell colour={colour} collapsed onToggle={() => setCollapsed(false)}>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.md}px`, minWidth: 0 }}>
          <Identity viewInfo={viewInfo} />
        </Box>
      </DockShell>
    );
  }

  return (
    <DockShell colour={colour} onToggle={() => setCollapsed(true)}>
      {/* Your player board: the cards you hold and the fleets you command.
          Fleets sit here rather than in the column because deploying one
          targets the map, and the map is directly above. */}
      <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, flex: 1, minWidth: 0, height: "100%", pb: "2px", pr: "28px" }}>
        <DockCards
          trainAction={
            <KingdomActions
              layout="inline"
              only={["train", "levies"]}
              colour={colour}
              shipyards={viewInfo.shipyards}
              counsellorLocations={viewInfo.playerBoardCounsellorLocations}
              moves={props.moves}
            />
          }
          fortuneCards={viewInfo.resources.fortuneCards}
          legacyCard={viewInfo.resources.legacyCard}
          advantageCard={viewInfo.resources.advantageCard}
          eventCards={viewInfo.resources.eventCards}
          resolvedEvent={props.G.eventState.resolvedEvent}
          eventContributions={props.G.eventState.eventContributions}
          playerInfo={props.G.playerInfo}
        />

        <Box sx={{ width: "1px", alignSelf: "stretch", my: "2px", flexShrink: 0, background: `linear-gradient(180deg, transparent, ${tokens.ui.gold}55, transparent)` }} />

        <Shipyards
          built={viewInfo.shipyards}
          action={
            <KingdomActions
              layout="inline"
              only={["skyships"]}
              colour={colour}
              shipyards={viewInfo.shipyards}
              counsellorLocations={viewInfo.playerBoardCounsellorLocations}
              moves={props.moves}
            />
          }
        />

        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
            <SectionHeader label="Fleets" />
            {homeFleets.length > 0 && (
              <Tooltip title="Load and unload fleets at Home Waters" placement="top" arrow>
                <span>
                  <GameButton variant="ghost" size="sm" onClick={() => setManageFleetsOpen(true)}>
                    Manage
                  </GameButton>
                </span>
              </Tooltip>
            )}

          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <FleetStrip
              fleets={viewInfo.fleetInfo}
              tileMap={props.G.mapState.currentTileArray}
              deployableFleetIds={deployableFleetIds}
              colour={colour}
              onDeploy={isMyActionsTurn ? handleDeploy : undefined}
              onViewLocation={props.onOpenFleetLocation}
            />
          </Box>
        </Box>
      </Box>

      {homeFleets.length > 0 && (
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
      ...backgrounds.panelSurface,
      boxShadow: "inset 0 8px 12px -8px rgba(0,0,0,0.22)",
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

/** Kingdom name + colour, shown when the dock is collapsed to a strip */
const Identity = ({ viewInfo }: { viewInfo: ViewInfo }) => (
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
      {viewInfo.kingdomName} (you)
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
  fortuneCards,
  legacyCard,
  advantageCard,
  eventCards,
  resolvedEvent,
  eventContributions,
  playerInfo,
  trainAction,
}: {
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  legacyCard: { name: string; colour: string } | undefined;
  advantageCard: string | undefined;
  eventCards: EventCardName[];
  resolvedEvent: EventCardName | null;
  eventContributions: Record<string, EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
  /** Train Troops — the muster that fills the Fortunes hand */
  trainAction?: React.ReactNode;
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
      {/* The hand shown as a hand: real card faces, grouped by kind. Rows of
          labelled boxes read as a list of facts; these read as cards you hold. */}
      <Box sx={{ display: "flex", alignItems: "stretch", gap: "10px", height: "100%", minWidth: 0, overflowX: "auto", pb: "2px" }}>
        <CardGroup
          label={`Fortunes · ${fortuneCards.length}/${FOW_HAND_MAX}`}
          action={trainAction}
        >
          {/* Always the full hand limit, so you can see how much room is left
              — the rulebook caps a Fortunes hand at four. */}
          {Array.from({ length: FOW_HAND_MAX }).map((_, i) => {
            const card = fortuneCards[i];
            if (!card) return <EmptySlot key={`slot-${i}`} />;
            const flipped = card.flipped;
            const title = card.sword > 0 ? `${card.sword} Swords` : card.shield > 0 ? `${card.shield} Shields` : "No Effect";
            return (
              <CardFace
                key={i}
                art={flipped ? getFoWCardImage(card) : FOW_CARD_BACK}
                caption={flipped ? (card.sword > 0 ? `${card.sword}\u2694` : card.shield > 0 ? `${card.shield}\u{1F6E1}` : "\u2014") : undefined}
                onClick={
                  flipped
                    ? (e) => setCardPreview({ anchor: e.currentTarget, card: { src: getFoWCardImage(card), title, description: `\u2694 ${card.sword}  \u{1F6E1} ${card.shield}` } })
                    : undefined
                }
              />
            );
          })}
        </CardGroup>

        <CardGroup label="Legacy" empty={!legacyCard} emptyText="none yet">
          {legacyCard && (
              <CardFace
                art={LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()]}
                caption={legacyCard.name}
                accent={legacyColour}
                onClick={(e) =>
                  setCardPreview({
                    anchor: e.currentTarget,
                    card: { src: LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()], title: legacyCard.name, description: legacyDef?.description, colour: legacyCard.colour },
                  })
                }
              />
            )}
        </CardGroup>

        <CardGroup label="Advantage" empty={!advantageCard} emptyText="none yet">
          {advantageCard && (
            <CardFace
              art={KA_CARD_IMAGES[advantageCard]}
              caption={kaTitle}
              onClick={(e) => setCardPreview({ anchor: e.currentTarget, card: { src: KA_CARD_IMAGES[advantageCard], title: kaTitle ?? "", description: kaDef?.description } })}
            />
          )}
        </CardGroup>

        <CardGroup
          label={resolvedDef ? "Event \u00b7 resolved" : `Events \u00b7 ${eventCards.length}`}
          empty={!hasEventInfo}
          emptyText="hand empty"
          onLabelClick={hasEventInfo ? (e) => setEventsAnchor(e.currentTarget) : undefined}
        >
          {resolvedDef && <EventFace name={resolvedDef.displayName} card={resolvedEvent!} resolved onClick={(e) => setEventsAnchor(e.currentTarget)} />}
          {!resolvedDef &&
            eventCards.map((card, i) => (
              <EventFace key={`${card}-${i}`} name={EVENT_CARD_DEFS[card].displayName} card={card} onClick={(e) => setEventsAnchor(e.currentTarget)} />
            ))}
        </CardGroup>
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

/**
 * Card tile — the action board's row vocabulary applied to the dock, so the
 * hand reads as the same system as the board rather than four plain boxes.
 * `art` is the real card image, feathered into the left edge like the
 * board's action thumbnails.
 */
/** A labelled run of card faces — fortunes, legacy, advantage, events. */
const CardGroup = ({
  label,
  empty = false,
  emptyText,
  onLabelClick,
  action,
  children,
}: {
  label: string;
  empty?: boolean;
  emptyText?: string;
  onLabelClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** The muster that fills this group, sitting on its header */
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flexShrink: 0 }}>
    <Box onClick={onLabelClick} sx={{ cursor: onLabelClick ? "pointer" : "default" }}>
      <SectionHeader label={label} action={action} />
    </Box>
    <Box sx={{ display: "flex", gap: "4px", alignItems: "stretch", flex: 1, minHeight: 0 }}>
      {empty ? <EmptySlot>{emptyText}</EmptySlot> : children}
    </Box>
  </Box>
);

/**
 * Your shipyards, as the thing they are rather than a button that mentions
 * them. Three berthing docks (MAX_SHIPYARDS) — built ones can lay down hulls
 * each round, empty ones are ground you haven't developed. Sits beside Fleets
 * because this is where the hulls that crew them come from; the yards
 * themselves are still built from Construction on the shared board.
 */
const Shipyards = ({ built, action }: { built: number; action: React.ReactNode }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flexShrink: 0 }}>
    <SectionHeader label="Shipyards" />
    {action}
    {/* The yards sit under the control that uses them, filling the height the
        button leaves — status below the action, not squeezed beside a label. */}
    <Tooltip
      title={`${built} of ${MAX_SHIPYARDS} yards working — each lays down 1–2 skyships a round. Build more from Construction.`}
      placement="top"
      arrow
    >
      <Box sx={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "space-around", flex: 1, minHeight: 0, px: "4px" }}>
        {Array.from({ length: MAX_SHIPYARDS }).map((_, i) => {
          const lit = i < built;
          return (
            <GiCrane
              key={i}
              size={30}
              color={lit ? tokens.ui.gold : tokens.ui.borderMedium}
              style={{
                opacity: lit ? 1 : 0.42,
                filter: lit ? `drop-shadow(0 0 5px ${tokens.ui.gold}88)` : "none",
                transition: "opacity 200ms, filter 200ms",
              }}
            />
          );
        })}
      </Box>
    </Tooltip>
  </Box>
);

/** A vacant card position — reserved so capacity is legible, not implied. */
const EmptySlot = ({ children }: { children?: React.ReactNode }) => (
  <Box
    sx={{
      width: CARD_W,
      flexShrink: 0,
      border: `1px dashed ${tokens.ui.borderMedium}`,
      borderRadius: `${tokens.radius.sm}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: "4px",
    }}
  >
    {children && <TileEmptyText>{children}</TileEmptyText>}
  </Box>
);

/** One card, shown as a card: art to the edge, caption on a scrim. */
const CardFace = ({
  art,
  caption,
  accent,
  onClick,
}: {
  art: string;
  caption?: string;
  accent?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      position: "relative",
      width: CARD_W,
      flexShrink: 0,
      borderRadius: `${tokens.radius.sm}px`,
      overflow: "hidden",
      border: `1px solid ${tokens.ui.borderMedium}`,
      borderTop: accent ? `2px solid ${accent}` : `1px solid ${tokens.ui.borderMedium}`,
      backgroundImage: `url(${art})`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      boxShadow: "0 1px 3px rgba(80,60,30,0.35)",
      cursor: onClick ? "pointer" : "default",
      transition: `transform ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`,
      ...(onClick && {
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 6px 14px rgba(80,60,30,0.45)" },
      }),
    }}
  >
    {caption && (
      <Typography
        noWrap
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          px: "4px",
          py: "2px",
          fontFamily: tokens.font.body,
          fontSize: 10,
          fontWeight: 700,
          textAlign: "center",
          color: "#F5ECD8",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 55%)",
          textTransform: "capitalize",
        }}
      >
        {caption}
      </Typography>
    )}
  </Box>
);

/** Events ship without art, so their face is an emblem on parchment. */
const EventFace = ({
  name,
  card,
  resolved = false,
  onClick,
}: {
  name: string;
  card: EventCardName;
  resolved?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}) => {
  const Icon = EVENT_ICONS[card];
  const def = EVENT_CARD_DEFS[card];
  const tone = def?.isBattle ? tokens.ui.danger : tokens.ui.gold;
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: CARD_W,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        px: "3px",
        borderRadius: `${tokens.radius.sm}px`,
        overflow: "hidden",
        border: `1px solid ${tokens.ui.borderMedium}`,
        borderTop: `2px solid ${resolved ? tokens.ui.gold : tone}`,
        background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
        boxShadow: "0 1px 3px rgba(80,60,30,0.35)",
        cursor: onClick ? "pointer" : "default",
        transition: `transform ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`,
        ...(onClick && {
          "&:hover": { transform: "translateY(-3px)", boxShadow: "0 6px 14px rgba(80,60,30,0.45)" },
        }),
      }}
    >
      {Icon && <Icon size={26} color={tone} style={{ opacity: 0.9 }} />}
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: 9.5,
          fontWeight: 600,
          lineHeight: 1.15,
          textAlign: "center",
          color: tokens.ui.text,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {name}
      </Typography>
      {resolved && (
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: tokens.ui.gold, lineHeight: 1, letterSpacing: "0.06em" }}>
          RESOLVED
        </Typography>
      )}
    </Box>
  );
};

const TileEmptyText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", lineHeight: 1.2 }}>
    {children}
  </Typography>
);




