/**
 * PlayerBoardFull — actions phase only.
 *
 * Four sections stacked vertically in a scrollable left panel:
 *   1. Available Forces (resource chips)
 *   2. Kingdom Actions (counsellor placement buttons)
 *   3. Fleets (accordion with skyship visuals)
 *   4. Cards (drawer tabs: FoW / Legacy / KA)
 */
import { memo, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { tokens } from "@/theme";
import { lazy, Suspense } from "react";
import { FleetInfo, MyGameProps, PlayerFortuneOfWarCardInfo, findPossibleDestinations, LEGACY_CARD_DEFS, KA_CARD_DEFS, EVENT_CARD_DEFS } from "@eots/game";
import { EVENT_ICONS } from "@/components/Events/eventCardIcons";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.webp";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.webp";

const WorldMap = lazy(() => import("../WorldMap/WorldMap"));
import { IconCounsellor, IconGold, IconVP, IconRegiment, IconElite, IconLevy, IconSkyship } from "@/theme";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { GamePanel } from "@/components/atoms/GamePanel";
import { GameButton } from "@/components/atoms/GameButton";
import { CardFrame } from "@/components/atoms/CardFrame";
import { Holdings } from "./Holdings";
import { useActionHover } from "@/components/ActionBoard/ActionHoverContext";
import { getLocationPresentation } from "@/utils/locationLabels";
import {
  SWORD_CARDS,
  SHIELD_CARDS,
  NO_EFFECT_CARD,
  FOW_CARD_BACK,
} from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";

interface PlayerBoardFullProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
}

// ── Brass section divider ───────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.sm}px`,
      mb: `${tokens.spacing.sm}px`,
    }}
  >
    <Box
      sx={{
        height: "1px",
        width: 12,
        background: `linear-gradient(90deg, transparent, ${tokens.ui.gold})`,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontFamily: tokens.font.accent,
        fontSize: tokens.fontSize.xs,
        fontWeight: 600,
        color: tokens.ui.gold,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        height: "1px",
        flex: 1,
        background: `linear-gradient(90deg, ${tokens.ui.gold}, transparent)`,
      }}
    />
  </Box>
);

// ── Counsellor indicator ────────────────────────────────────────────────

const CounsellorDot = ({ placed, colour }: { placed: boolean; colour: string }) => (
  <Box
    sx={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: placed ? "none" : `2px solid ${tokens.ui.textMuted}`,
      backgroundColor: placed ? colour : "transparent",
      boxShadow: placed ? `0 0 6px ${colour}88` : "none",
      flexShrink: 0,
      transition: `all ${tokens.transition.fast}`,
    }}
  />
);

// ── FoW card image helper ────────────────────────────────────────────────

const getFoWCardImage = (card: PlayerFortuneOfWarCardInfo): string => {
  if (!card.flipped) return FOW_CARD_BACK;
  if (card.sword > 0) return SWORD_CARDS[card.sword] ?? NO_EFFECT_CARD;
  if (card.shield > 0) return SHIELD_CARDS[card.shield] ?? NO_EFFECT_CARD;
  return NO_EFFECT_CARD;
};

// ── Skyship visual (circle + troop slot) ────────────────────────────────

const SKYSHIP_SIZE = 44;
const TROOP_SLOT_SIZE = 34;

type TroopType = "regiment" | "elite" | "levy" | "empty";

const TROOP_ICONS: Record<TroopType, string> = {
  regiment: "⚔",
  elite: "🎖",
  levy: "🛡",
  empty: "",
};

const TROOP_COLORS: Record<TroopType, string> = {
  regiment: tokens.ui.text,
  elite: tokens.allegiance.orthodox,
  levy: tokens.ui.textMuted,
  empty: "transparent",
};

/**
 * Distribute troops visually across skyship slots.
 * Order: regiments → elites → levies, left to right.
 */
const distributeTroops = (fleet: FleetInfo): TroopType[] => {
  const slots: TroopType[] = [];
  for (let i = 0; i < fleet.regiments; i++) slots.push("regiment");
  for (let i = 0; i < fleet.eliteRegiments; i++) slots.push("elite");
  for (let i = 0; i < fleet.levies; i++) slots.push("levy");
  // Pad to skyship count
  while (slots.length < fleet.skyships) slots.push("empty");
  return slots;
};

const SkyshipVisual = ({
  hasSkyship,
  troopType,
  colour,
}: {
  hasSkyship: boolean;
  troopType: TroopType;
  colour: string;
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
    }}
  >
    {/* Skyship circle */}
    <Box
      sx={{
        width: SKYSHIP_SIZE,
        height: SKYSHIP_SIZE,
        borderRadius: "50%",
        border: hasSkyship
          ? `2px solid ${colour}`
          : `2px dashed ${tokens.ui.borderMedium}`,
        backgroundColor: hasSkyship ? `${colour}22` : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.2em",
        boxShadow: hasSkyship ? `0 0 8px ${colour}33` : "none",
      }}
    >
      {hasSkyship && "🚢"}
    </Box>
    {/* Troop slot */}
    <Box
      sx={{
        width: TROOP_SLOT_SIZE,
        height: TROOP_SLOT_SIZE,
        borderRadius: `${tokens.radius.sm}px`,
        border:
          troopType === "empty"
            ? `2px dashed ${tokens.ui.borderMedium}`
            : `2px solid ${TROOP_COLORS[troopType]}55`,
        backgroundColor:
          troopType === "empty" ? "transparent" : `${TROOP_COLORS[troopType]}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.9em",
      }}
    >
      {TROOP_ICONS[troopType]}
    </Box>
  </Box>
);

// ── Section 3: Fleets (accordion) ───────────────────────────────────────

const MAX_SKYSHIPS = 5;

const FleetAccordion = ({
  fleets,
  colour,
  tileMap,
  onViewLocation,
  onDeploy,
  moves,
}: {
  fleets: FleetInfo[];
  colour: string;
  tileMap: any[][];
  onViewLocation?: (location: number[]) => void;
  onDeploy?: (fleetIndex: number) => void;
  moves: MyGameProps["moves"];
}) => {
  const [expandedFleet, setExpandedFleet] = useState<number | null>(null);

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Fleets" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {fleets.map((fleet) => {
          const isExpanded = expandedFleet === fleet.fleetId;
          const loc = getLocationPresentation(tileMap, fleet.location);
          const troopSlots = distributeTroops(fleet);

          return (
            <Box key={fleet.fleetId}>
              {/* Fleet header — click to expand/collapse */}
              <Box
                onClick={() =>
                  setExpandedFleet(isExpanded ? null : fleet.fleetId)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: `${tokens.spacing.sm}px`,
                  px: `${tokens.spacing.sm}px`,
                  py: `${tokens.spacing.xs}px`,
                  cursor: "pointer",
                  borderRadius: `${tokens.radius.sm}px`,
                  backgroundColor: isExpanded
                    ? tokens.ui.surfaceHover
                    : "transparent",
                  "&:hover": {
                    backgroundColor: tokens.ui.surfaceHover,
                  },
                  transition: `background-color ${tokens.transition.fast}`,
                }}
              >
                {/* Expand/collapse indicator */}
                <Typography
                  sx={{
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                    lineHeight: 1,
                    width: 12,
                    flexShrink: 0,
                  }}
                >
                  {isExpanded ? "▾" : "▸"}
                </Typography>

                {/* Fleet name + location */}
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

                {/* Summary chips */}
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

              {/* Expanded fleet content */}
              {isExpanded && (
                <Box
                  sx={{
                    mt: "2px",
                    p: `${tokens.spacing.sm}px`,
                    backgroundColor: tokens.ui.surface,
                    border: `1px solid ${tokens.ui.border}`,
                    borderRadius: `${tokens.radius.md}px`,
                  }}
                >
                  {/* Skyship grid */}
                  {fleet.skyships === 0 ? (
                    <Typography
                      sx={{
                        fontFamily: tokens.font.body,
                        fontSize: tokens.fontSize.xs,
                        color: tokens.ui.textMuted,
                        textAlign: "center",
                        py: `${tokens.spacing.sm}px`,
                      }}
                    >
                      No skyships in this fleet
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `repeat(auto-fill, minmax(56px, 1fr))`,
                        gap: `${tokens.spacing.sm}px`,
                        justifyItems: "center",
                        mb: `${tokens.spacing.sm}px`,
                      }}
                    >
                      {Array.from({ length: Math.max(fleet.skyships, 1) }).map(
                        (_, i) => (
                          <SkyshipVisual
                            key={i}
                            hasSkyship={i < fleet.skyships}
                            troopType={troopSlots[i] ?? "empty"}
                            colour={colour}
                          />
                        )
                      )}
                    </Box>
                  )}

                  {/* Fleet actions */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: `${tokens.spacing.sm}px`,
                      flexWrap: "wrap",
                    }}
                  >
                    {onDeploy && (
                      <GameButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeploy(fleet.fleetId)}
                        disabled={fleet.skyships === 0}
                        disabledReason="No skyships to deploy"
                      >
                        Deploy
                      </GameButton>
                    )}
                    <GameButton
                      variant="ghost"
                      size="sm"
                      disabled={fleets.length < 2}
                      disabledReason="Need multiple fleets to transfer"
                      onClick={() => {
                        // Transfer: move all from this fleet to the next fleet at same location
                        const otherFleet = fleets.find(
                          (f) =>
                            f.fleetId !== fleet.fleetId &&
                            f.location[0] === fleet.location[0] &&
                            f.location[1] === fleet.location[1]
                        );
                        if (otherFleet) {
                          moves.transferBetweenFleets(
                            fleet.fleetId,
                            otherFleet.fleetId,
                            fleet.skyships,
                            fleet.regiments,
                            fleet.levies,
                            fleet.eliteRegiments
                          );
                        }
                      }}
                    >
                      Transfer
                    </GameButton>
                    {onViewLocation && (
                      <GameButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewLocation(fleet.location)}
                      >
                        View on Map
                      </GameButton>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </GamePanel>
  );
};

// ── Section 0: Kingdom Resources ────────────────────────────────────────

const Treasury = ({
  counsellors,
  gold,
  victoryPoints,
  heresyTracker,
  hereticOrOrthodox,
}: {
  counsellors: number;
  gold: number;
  victoryPoints: number;
  heresyTracker: number;
  hereticOrOrthodox: string;
}) => {
  const isHeretic = hereticOrOrthodox === "heretic";
  const heresyVP = isHeretic ? heresyTracker : -heresyTracker;
  const vpSign = heresyVP > 0 ? "+" : "";
  const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;
  const alLabel = isHeretic ? "Heretic" : "Orthodox";

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Treasury" />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px` }}>
        <ResourceChip
          icon={<IconCounsellor style={{ fontSize: 18, color: tokens.ui.gold }} />}
          value={counsellors}
          label="Counsel."
          size="md"
          variant={counsellors === 0 ? "muted" : "default"}
        />
        <ResourceChip
          icon={<IconGold style={{ fontSize: 18, color: gold < 0 ? tokens.ui.danger : tokens.ui.gold }} />}
          value={gold}
          label="Gold"
          size="md"
          variant={gold < 0 ? "negative" : "default"}
        />
        <ResourceChip
          icon={<IconVP style={{ fontSize: 18, color: tokens.ui.gold }} />}
          value={victoryPoints}
          label="Victory Points"
          size="md"
        />
        {/* Allegiance + Heresy VP */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            px: `${tokens.spacing.sm}px`,
            height: 32,
            borderRadius: `${tokens.radius.pill}px`,
            background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
            border: `1px solid ${alColor}44`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: alColor,
              boxShadow: `0 0 4px ${alColor}88`,
              flexShrink: 0,
            }}
          />
          <Typography
            component="span"
            sx={{
              fontSize: tokens.fontSize.sm,
              fontFamily: tokens.font.body,
              fontWeight: 600,
              color: alColor,
              lineHeight: 1,
            }}
          >
            {alLabel}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: tokens.fontSize.sm,
              fontFamily: tokens.font.body,
              fontWeight: 700,
              color: heresyVP >= 0 ? tokens.ui.success : tokens.ui.danger,
              lineHeight: 1,
            }}
          >
            {vpSign}{heresyVP} Victory Points
          </Typography>
        </Box>
      </Box>
    </GamePanel>
  );
};

// ── Section 1: Available Forces ─────────────────────────────────────────

const AvailableForces = ({
  regiments,
  eliteRegiments,
  levies,
  skyships,
}: {
  regiments: number;
  eliteRegiments: number;
  levies: number;
  skyships: number;
}) => {
  const forces = [
    { Icon: IconRegiment, value: regiments, label: "Regiments" },
    { Icon: IconElite, value: eliteRegiments, label: "Elite" },
    { Icon: IconLevy, value: levies, label: "Levies" },
    { Icon: IconSkyship, value: skyships, label: "Skyships" },
  ];

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Available Forces" />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px` }}>
        {forces.map((f) => (
          <ResourceChip
            key={f.label}
            icon={<f.Icon style={{ fontSize: 18 }} />}
            value={f.value}
            label={f.label}
            size="md"
            variant={f.value === 0 ? "muted" : "default"}
            sx={{
              fontWeight: 600,
              fontSize: "clamp(0.875rem, 1vw, 1.125rem)",
              ...(f.value > 0 && { borderColor: `${tokens.ui.gold}33` }),
            }}
          />
        ))}
      </Box>
    </GamePanel>
  );
};

// ── Section 2: Kingdom Actions ──────────────────────────────────────────

type FleetAllocation = {
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
};

const emptyAllocation = (): FleetAllocation => ({
  skyships: 0, regiments: 0, levies: 0, eliteRegiments: 0,
});

const KingdomActions = ({
  colour,
  shipyards,
  counsellorLocations,
  moves,
  fleets,
  gameProps,
}: {
  colour: string;
  shipyards: number;
  counsellorLocations: {
    buildSkyships: boolean;
    conscriptLevies: boolean;
    trainTroops: boolean;
    dispatchSkyshipFleet: boolean;
    dispatchDisabled: boolean;
  };
  moves: MyGameProps["moves"];
  fleets: FleetInfo[];
  gameProps: MyGameProps;
}) => {
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [levyDialogOpen, setLevyDialogOpen] = useState(false);
  const [levyCount, setLevyCount] = useState(3);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchFleetIndex, setDispatchFleetIndex] = useState(0);
  const [dispatchDest, setDispatchDest] = useState<number[] | null>(null);
  const [dispatchAlloc, setDispatchAlloc] = useState<FleetAllocation>(emptyAllocation());

  const handleBuildSkyships = (perYard: number) => {
    moves.buildSkyships(perYard);
    setBuildDialogOpen(false);
  };

  const handleConscriptLevies = () => {
    moves.enableDispatchButtons(true);
    moves.conscriptLevies(levyCount);
    setLevyDialogOpen(false);
    setLevyCount(3);
  };

  const { setHoveredAction } = useActionHover();

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Kingdom Actions" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.sm}px` }}>
        {/* 1. Build Skyships */}
        <GameButton
          variant="secondary"
          fullWidth
          onMouseEnter={() => setHoveredAction("build-skyships")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={() => {
            moves.enableDispatchButtons(true);
            setBuildDialogOpen(true);
          }}
          disabled={counsellorLocations.buildSkyships || shipyards === 0}
          disabledReason={
            shipyards === 0 ? "No shipyards"
              : "Already built this round"
          }
          icon={<CounsellorDot placed={counsellorLocations.buildSkyships} colour={colour} />}
        >
          Build Skyships ({shipyards} {shipyards === 1 ? "yard" : "yards"})
        </GameButton>

        {/* 2. Conscript Levies */}
        <GameButton
          variant="secondary"
          fullWidth
          onMouseEnter={() => setHoveredAction("conscript-levies")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={() => setLevyDialogOpen(true)}
          disabled={counsellorLocations.conscriptLevies}
          disabledReason="Already conscripted this round"
          icon={<CounsellorDot placed={counsellorLocations.conscriptLevies} colour={colour} />}
        >
          Conscript Levies
        </GameButton>

        {/* 3. Train Troops */}
        <GameButton
          variant="secondary"
          fullWidth
          onMouseEnter={() => setHoveredAction("train-troops")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={() => moves.trainTroops()}
          disabled={counsellorLocations.trainTroops}
          disabledReason="Already trained this round"
          icon={<CounsellorDot placed={counsellorLocations.trainTroops} colour={colour} />}
        >
          Train Troops
        </GameButton>

        {/* 4. Dispatch Fleet */}
        <GameButton
          variant="secondary"
          fullWidth
          onMouseEnter={() => setHoveredAction("dispatch-fleet")}
          onMouseLeave={() => setHoveredAction(null)}
          onClick={() => {
            moves.enableDispatchButtons(true);
            setDispatchAlloc(emptyAllocation());
            setDispatchDest(null);
            setDispatchFleetIndex(0);
            setDispatchOpen(true);
          }}
          disabled={counsellorLocations.dispatchSkyshipFleet || counsellorLocations.dispatchDisabled}
          disabledReason={
            counsellorLocations.dispatchSkyshipFleet ? "Already dispatched this round"
              : "Dispatch unavailable"
          }
          icon={<CounsellorDot placed={counsellorLocations.dispatchSkyshipFleet} colour={colour} />}
        >
          Dispatch Fleet
        </GameButton>
      </Box>

      {/* ── Build Skyships dialog ──────────────────────────────────── */}
      <Dialog
        open={buildDialogOpen}
        onClose={() => setBuildDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: tokens.ui.surface,
            border: `1px solid ${tokens.ui.borderMedium}`,
            borderRadius: `${tokens.radius.lg}px`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tokens.font.display,
            color: tokens.ui.gold,
            pb: 1,
          }}
        >
          Build Skyships
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.text, fontSize: tokens.fontSize.sm }}>
            You have {shipyards} shipyard{shipyards !== 1 ? "s" : ""}. How many skyships per yard?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <GameButton variant="ghost" onClick={() => setBuildDialogOpen(false)}>
            Cancel
          </GameButton>
          <GameButton variant="secondary" onClick={() => handleBuildSkyships(1)}>
            1 per yard ({shipyards}g)
          </GameButton>
          <GameButton variant="primary" onClick={() => handleBuildSkyships(2)}>
            2 per yard ({shipyards * 2}g)
          </GameButton>
        </DialogActions>
      </Dialog>

      {/* ── Conscript Levies dialog ────────────────────────────────── */}
      <Dialog
        open={levyDialogOpen}
        onClose={() => setLevyDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: tokens.ui.surface,
            border: `1px solid ${tokens.ui.borderMedium}`,
            borderRadius: `${tokens.radius.lg}px`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tokens.font.display,
            color: tokens.ui.gold,
            pb: 1,
          }}
        >
          Conscript Levies
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.text, fontSize: tokens.fontSize.sm, mb: 2 }}>
            Choose how many levies to raise (in batches of 3). Costs 1 Victory Point per 10 levies.
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.md}px`, justifyContent: "center" }}>
            <GameButton
              variant="ghost"
              size="sm"
              onClick={() => setLevyCount((c) => Math.max(3, c - 3))}
              disabled={levyCount <= 3}
            >
              −
            </GameButton>
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.lg,
                color: tokens.ui.text,
                fontWeight: 700,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              {levyCount}
            </Typography>
            <GameButton
              variant="ghost"
              size="sm"
              onClick={() => setLevyCount((c) => Math.min(12, c + 3))}
              disabled={levyCount >= 12}
            >
              +
            </GameButton>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <GameButton variant="ghost" onClick={() => setLevyDialogOpen(false)}>
            Cancel
          </GameButton>
          <GameButton variant="primary" onClick={handleConscriptLevies}>
            Conscript {levyCount} Levies
          </GameButton>
        </DialogActions>
      </Dialog>

      {/* ── Dispatch Fleet dialog ──────────────────────────────────── */}
      <Dialog
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: tokens.ui.surface,
            border: `1px solid ${tokens.ui.borderMedium}`,
            borderRadius: `${tokens.radius.lg}px`,
            maxHeight: "85vh",
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: tokens.font.display, color: tokens.ui.gold, pb: 1 }}
        >
          Dispatch Fleet
        </DialogTitle>
        <DialogContent>
          {/* Fleet selector */}
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.textMuted,
              mb: 1,
            }}
          >
            Select fleet:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            {fleets.map((f, i) => (
              <GameButton
                key={f.fleetId}
                variant={dispatchFleetIndex === i ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setDispatchFleetIndex(i);
                  setDispatchAlloc(emptyAllocation());
                  setDispatchDest(null);
                }}
              >
                Fleet {i + 1}
              </GameButton>
            ))}
          </Box>

          {/* Resource allocation */}
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.textMuted,
              mb: 1,
            }}
          >
            Load from reserves:
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
            {([
              { key: "skyships" as const, label: "🚢 Skyships", max: gameProps.G.playerInfo[gameProps.playerID ?? gameProps.ctx.currentPlayer].resources.skyships },
              { key: "regiments" as const, label: "⚔ Regiments", max: gameProps.G.playerInfo[gameProps.playerID ?? gameProps.ctx.currentPlayer].resources.regiments },
              { key: "eliteRegiments" as const, label: "🎖 Elite", max: gameProps.G.playerInfo[gameProps.playerID ?? gameProps.ctx.currentPlayer].resources.eliteRegiments ?? 0 },
              { key: "levies" as const, label: "🛡 Levies", max: gameProps.G.playerInfo[gameProps.playerID ?? gameProps.ctx.currentPlayer].resources.levies },
            ]).map(({ key, label, max }) => (
              <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    color: tokens.ui.text,
                    width: 100,
                  }}
                >
                  {label}
                </Typography>
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDispatchAlloc((a) => ({ ...a, [key]: Math.max(0, a[key] - 1) }))
                  }
                  disabled={dispatchAlloc[key] <= 0}
                >
                  −
                </GameButton>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.base,
                    color: tokens.ui.text,
                    fontWeight: 700,
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {dispatchAlloc[key]}
                </Typography>
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDispatchAlloc((a) => ({ ...a, [key]: Math.min(max, a[key] + 1) }))
                  }
                  disabled={dispatchAlloc[key] >= max}
                >
                  +
                </GameButton>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                  }}
                >
                  / {max}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Destination map */}
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.textMuted,
              mb: 1,
            }}
          >
            Select destination:{" "}
            {dispatchDest ? (
              <Box component="span" sx={{ color: tokens.ui.gold, fontWeight: 600 }}>
                {getLocationPresentation(gameProps.G.mapState.currentTileArray, dispatchDest).fullLabel}
              </Box>
            ) : (
              "click a tile on the map"
            )}
          </Typography>
          <Box
            sx={{
              height: 300,
              border: `1px solid ${tokens.ui.border}`,
              borderRadius: `${tokens.radius.md}px`,
              overflow: "hidden",
            }}
          >
            <Suspense fallback={null}>
              <WorldMap
                {...gameProps}
                alternateOnClick={(coords) => setDispatchDest(coords)}
                selectableTiles={(() => {
                  const fleet = fleets[dispatchFleetIndex];
                  if (!fleet) return [];
                  const unladen = dispatchAlloc.regiments === 0 && dispatchAlloc.levies === 0 && dispatchAlloc.eliteRegiments === 0;
                  const [dests] = findPossibleDestinations(gameProps.G, fleet.location, unladen);
                  return dests;
                })()}
              />
            </Suspense>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <GameButton variant="ghost" onClick={() => setDispatchOpen(false)}>
            Cancel
          </GameButton>
          <GameButton
            variant="primary"
            disabled={!dispatchDest || dispatchAlloc.skyships === 0}
            disabledReason={
              dispatchAlloc.skyships === 0
                ? "Must assign at least 1 skyship"
                : "Select a destination"
            }
            onClick={() => {
              if (!dispatchDest) return;
              moves.enableDispatchButtons(true);
              moves.deployFleet(
                dispatchFleetIndex,
                dispatchDest,
                dispatchAlloc.skyships,
                dispatchAlloc.regiments,
                dispatchAlloc.levies,
                dispatchAlloc.eliteRegiments
              );
              setDispatchOpen(false);
            }}
          >
            Deploy Fleet
          </GameButton>
        </DialogActions>
      </Dialog>
    </GamePanel>
  );
};

// ── Section 4: Cards (drawer tabs) ──────────────────────────────────────

type CardTab = "fow" | "legacy" | "ka" | "events";

const CARD_WIDTH = 100;
const CARD_HEIGHT = 180;

const CardDrawers = ({
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
  eventCards: import("@eots/game").EventCardName[];
  resolvedEvent: import("@eots/game").EventCardName | null;
  eventContributions: Record<string, import("@eots/game").EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}) => {
  const [openTab, setOpenTab] = useState<CardTab | null>(null);
  const [enlargedCard, setEnlargedCard] = useState<{ src: string; title: string; description?: string } | null>(null);

  const toggleTab = (tab: CardTab) =>
    setOpenTab((prev) => (prev === tab ? null : tab));

  const fowCount = fortuneCards.length;
  const legacyCount = legacyCard ? 1 : 0;
  const kaCount = advantageCard ? 1 : 0;
  const eventCount = eventCards.length;

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Cards" />

      {/* Tab buttons */}
      <Box
        sx={{
          display: "flex",
          gap: "2px",
          mb: openTab ? `${tokens.spacing.sm}px` : 0,
        }}
      >
        {([
          { key: "fow" as CardTab, label: "FoW", count: fowCount },
          { key: "legacy" as CardTab, label: "Legacy", count: legacyCount },
          { key: "ka" as CardTab, label: "KA", count: kaCount },
          { key: "events" as CardTab, label: "Events", count: eventCount },
        ]).map(({ key, label, count }) => (
          <Box
            key={key}
            onClick={() => count > 0 && toggleTab(key)}
            sx={{
              flex: 1,
              textAlign: "center",
              py: `${tokens.spacing.xs}px`,
              px: `${tokens.spacing.sm}px`,
              cursor: count > 0 ? "pointer" : "default",
              borderRadius: `${tokens.radius.sm}px`,
              backgroundColor:
                openTab === key ? tokens.ui.surfaceHover : "transparent",
              border: `1px solid ${
                openTab === key ? tokens.ui.borderMedium : tokens.ui.border
              }`,
              opacity: count === 0 ? 0.4 : 1,
              transition: `all ${tokens.transition.fast}`,
              "&:hover": count > 0 ? {
                backgroundColor: tokens.ui.surfaceHover,
              } : {},
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: openTab === key ? tokens.ui.gold : tokens.ui.textMuted,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {label} ({count})
            </Typography>
          </Box>
        ))}
      </Box>

      {/* FoW drawer */}
      {openTab === "fow" && (
        <Box
          sx={{
            display: "flex",
            gap: `${tokens.spacing.sm}px`,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {fortuneCards.map((card, i) => {
            const img = getFoWCardImage(card);
            const fowTitle = card.sword > 0
              ? `${card.sword} Sword${card.sword > 1 ? "s" : ""}`
              : card.shield > 0
                ? `${card.shield} Shield${card.shield > 1 ? "s" : ""}`
                : "No Effect";
            const fowDesc = card.sword > 0
              ? `Adds ${card.sword} sword${card.sword > 1 ? "s" : ""} to your combat strength when played in battle.`
              : card.shield > 0
                ? `Absorbs ${card.shield} sword${card.shield > 1 ? "s" : ""} of enemy damage when played in battle.`
                : "This card has no combat effect when played.";
            return (
              <CardFrame
                key={i}
                title={card.flipped ? fowTitle : undefined}
                description={
                  card.flipped
                    ? `⚔ ${card.sword}  🛡 ${card.shield}`
                    : undefined
                }
                imageUrl={img}
                faceDown={!card.flipped}
                cardBackUrl={FOW_CARD_BACK}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                onClick={card.flipped ? () => setEnlargedCard({ src: img, title: fowTitle, description: fowDesc }) : undefined}
              />
            );
          })}
        </Box>
      )}

      {/* Legacy drawer */}
      {openTab === "legacy" && (
        <>
          {legacyCard ? (() => {
            const img = LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()];
            const def = LEGACY_CARD_DEFS[legacyCard.name.toLowerCase() as keyof typeof LEGACY_CARD_DEFS];
            return (
              <Box
                onClick={() => setEnlargedCard({ src: img, title: legacyCard.name, description: def?.description })}
                sx={{
                  position: "relative",
                  borderRadius: `${tokens.radius.md}px`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: `all ${tokens.transition.fast}`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                  "&:hover": { boxShadow: `0 4px 16px rgba(0,0,0,0.25)`, transform: "scale(1.01)" },
                }}
              >
                <Box component="img" src={img} alt={legacyCard.name} sx={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.88) 0%, rgba(15,10,5,0.6) 60%, transparent 100%)", px: 2, pt: 4, pb: 1.5 }}>
                  <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.base, color: tokens.ui.gold, lineHeight: 1.2, textTransform: "capitalize" }}>
                    {legacyCard.name}
                  </Typography>
                  {def && (
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "rgba(235,225,210,0.85)", lineHeight: 1.4, mt: "2px" }}>
                      {def.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })() : (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, py: `${tokens.spacing.md}px`, textAlign: "center" }}>
              No Legacy Card
            </Typography>
          )}
        </>
      )}

      {/* KA drawer */}
      {openTab === "ka" && (
        <>
          {advantageCard ? (() => {
            const img = KA_CARD_IMAGES[advantageCard];
            const def = KA_CARD_DEFS[advantageCard as keyof typeof KA_CARD_DEFS];
            const title = def?.displayName ?? advantageCard.replace(/_/g, " ");
            return (
              <Box
                onClick={() => setEnlargedCard({ src: img, title, description: def?.description })}
                sx={{
                  position: "relative",
                  borderRadius: `${tokens.radius.md}px`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: `all ${tokens.transition.fast}`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                  "&:hover": { boxShadow: `0 4px 16px rgba(0,0,0,0.25)`, transform: "scale(1.01)" },
                }}
              >
                <Box component="img" src={img} alt={title} sx={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.88) 0%, rgba(15,10,5,0.6) 60%, transparent 100%)", px: 2, pt: 4, pb: 1.5 }}>
                  <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.base, color: tokens.ui.gold, lineHeight: 1.2, textTransform: "capitalize" }}>
                    {title}
                  </Typography>
                  {def && (
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "rgba(235,225,210,0.85)", lineHeight: 1.4, mt: "2px" }}>
                      {def.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })() : (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, py: `${tokens.spacing.md}px`, textAlign: "center" }}>
              No Advantage Card
            </Typography>
          )}
        </>
      )}

      {/* Events drawer */}
      {openTab === "events" && (() => {
        const hasContributions = Object.keys(eventContributions).length > 0;
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {resolvedEvent && (() => {
              const def = EVENT_CARD_DEFS[resolvedEvent];
              const Icon = EVENT_ICONS[resolvedEvent];
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, px: `${tokens.spacing.sm}px`, py: `${tokens.spacing.xs + 2}px`, borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.gold}55`, background: `linear-gradient(135deg, ${tokens.ui.gold}12 0%, transparent 100%)` }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `radial-gradient(circle, ${tokens.ui.gold}25 0%, transparent 70%)` }}>
                    {Icon && <Icon size={18} color={tokens.ui.gold} style={{ opacity: 0.9 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
                      Resolved
                    </Typography>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.gold, lineHeight: 1.2 }}>
                      {def.displayName}
                    </Typography>
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.3, mt: "1px" }}>
                      {def.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}

            {hasContributions && (
              <>
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                  Chosen Cards
                </Typography>
                {Object.entries(eventContributions).map(([pid, card]) => {
                  const def = EVENT_CARD_DEFS[card];
                  const Icon = EVENT_ICONS[card];
                  const player = playerInfo[pid];
                  const isResolved = card === resolvedEvent;
                  return (
                    <Box key={pid} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${isResolved ? `${tokens.ui.gold}44` : tokens.ui.border}`, backgroundColor: isResolved ? `${tokens.ui.gold}08` : tokens.ui.surface }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: player?.colour, flexShrink: 0, boxShadow: `0 0 4px ${player?.colour}66` }} />
                      <Box sx={{ width: 24, height: 24, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                      </Box>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, lineHeight: 1.2, flex: 1 }}>
                        {def.displayName}
                      </Typography>
                      {isResolved && (
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, fontWeight: 700, color: tokens.ui.gold, flexShrink: 0 }}>
                          ★
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </>
            )}

            {eventCards.length > 0 && (
              <>
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                  Your Hand
                </Typography>
                {eventCards.map((card, i) => {
                  const def = EVENT_CARD_DEFS[card];
                  const Icon = EVENT_ICONS[card];
                  return (
                    <Box key={`${card}-${i}`} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.border}`, backgroundColor: tokens.ui.surface }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                      </Box>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
                        {def.displayName}
                      </Typography>
                    </Box>
                  );
                })}
              </>
            )}
          </Box>
        );
      })()}

      {/* Card Lightbox */}
      <Dialog
        open={!!enlargedCard}
        onClose={() => setEnlargedCard(null)}
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
            maxWidth: "min(85vw, 520px)",
          },
        }}
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" } } }}
        onClick={() => setEnlargedCard(null)}
      >
        {enlargedCard && (
          <Box
            sx={{
              position: "relative",
              borderRadius: `${tokens.radius.md}px`,
              overflow: "hidden",
              boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <Box
              component="img"
              src={enlargedCard.src}
              alt={enlargedCard.title}
              sx={{
                width: "100%",
                display: "block",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(to top, rgba(15,10,5,0.92) 0%, rgba(15,10,5,0.7) 60%, transparent 100%)",
                px: 3,
                pt: 5,
                pb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: tokens.font.display,
                  fontSize: tokens.fontSize.lg,
                  color: tokens.ui.gold,
                  textAlign: "center",
                  textTransform: "capitalize",
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {enlargedCard.title}
              </Typography>
              {enlargedCard.description && (
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    color: "rgba(235,225,210,0.9)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {enlargedCard.description}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Dialog>
    </GamePanel>
  );
};

// ── Main component ──────────────────────────────────────────────────────

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
      {/* Kingdom name header */}
      <Box sx={{ px: `${tokens.spacing.xs}px` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: `${tokens.spacing.sm}px`,
          }}
        >
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

      {/* Section 0: Treasury */}
      <Treasury
        counsellors={playerInfo.resources.counsellors}
        gold={playerInfo.resources.gold}
        victoryPoints={playerInfo.resources.victoryPoints}
        heresyTracker={playerInfo.heresyTracker}
        hereticOrOrthodox={playerInfo.hereticOrOrthodox}
      />

      {/* Section 1: Available Forces */}
      <AvailableForces
        regiments={playerInfo.resources.regiments}
        eliteRegiments={playerInfo.resources.eliteRegiments ?? 0}
        levies={playerInfo.resources.levies}
        skyships={playerInfo.resources.skyships}
      />

      {/* Section 2: Kingdom Actions */}
      <KingdomActions
        colour={colour}
        shipyards={playerInfo.shipyards}
        counsellorLocations={playerInfo.playerBoardCounsellorLocations}
        moves={props.moves}
        fleets={playerInfo.fleetInfo}
        gameProps={props}
      />

      {/* Section 3: Fleets */}
      <FleetAccordion
        fleets={playerInfo.fleetInfo}
        colour={colour}
        tileMap={props.G.mapState.currentTileArray}
        onViewLocation={props.onOpenFleetLocation}
        onDeploy={(fleetIndex) => {
          // Open the dispatch dialog from Section 2 isn't possible here,
          // so Deploy triggers the dispatch flow directly for this fleet
          props.moves.enableDispatchButtons(true);
        }}
        moves={props.moves}
      />

      {/* Section 4: Cards */}
      <CardDrawers
        fortuneCards={playerInfo.resources.fortuneCards}
        legacyCard={playerInfo.resources.legacyCard}
        advantageCard={playerInfo.resources.advantageCard}
        eventCards={playerInfo.resources.eventCards}
        resolvedEvent={props.G.eventState.resolvedEvent}
        eventContributions={props.G.eventState.eventContributions}
        playerInfo={props.G.playerInfo}
      />

      {/* Section 5: Holdings (fills remaining space) */}
      <Holdings {...props} variant="full" />
    </Box>
  );
});
