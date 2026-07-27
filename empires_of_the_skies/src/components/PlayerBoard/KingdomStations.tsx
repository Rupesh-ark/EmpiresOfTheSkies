/**
 * Shared player-board pieces: MustersStatus and FleetStrip.
 *
 * The musters and fleets themselves live in the dock now, each beside what it
 * produces — Train Troops with the Fortunes hand it fills, Build Skyships
 * with the Fleets its hulls crew. What's left here is the two read-only
 * renderers the dock and the opponent-inspection drawer both draw from.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { IconRegiment, IconLevy, IconSkyship } from "@/theme";
import { GiAnchor } from "react-icons/gi";
import { MyGameProps, KINGDOM_LOCATION, FleetInfo, MAX_SKYSHIPS_PER_FLEET, fleetCombatValues } from "@eots/game";
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";

/** Read-only Musters — used when inspecting another kingdom. */
export const MustersStatus = ({
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

/**
 * One berth in a Fleet box. The rulebook makes this literal: a fleet holds up
 * to five Skyships, and "each Skyship can carry one Regiment or Levy" — so a
 * fleet IS five slots, each empty, crewed, or crewed-and-laden. Drawing them
 * says hull count, cargo, and remaining room at a glance; three numbers
 * reading "0 0 0" said none of it.
 */
const Berth = ({
  state,
  colour,
}: {
  state: "empty" | "ship" | "regiment" | "elite" | "levy";
  colour: string;
}) => {
  const filled = state !== "empty";
  const CargoIcon = state === "levy" ? IconLevy : state === "empty" || state === "ship" ? null : IconRegiment;
  return (
    <Box
      sx={{
        position: "relative",
        width: 20,
        height: 28,
        flexShrink: 0,
        borderRadius: "3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: filled ? `1px solid ${tokens.ui.borderMedium}` : `1px dashed ${tokens.ui.border}`,
        background: filled
          ? `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`
          : "transparent",
        boxShadow: filled ? "inset 0 1px 0 rgba(255,255,255,0.4)" : "none",
      }}
    >
      {filled && <IconSkyship style={{ fontSize: 13, color: colour, opacity: 0.95 }} />}
      {CargoIcon && (
        <Box
          sx={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 11,
            height: 11,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: state === "elite" ? tokens.ui.gold : tokens.ui.surfaceRaised,
            border: `1px solid ${tokens.ui.borderMedium}`,
          }}
        >
          <CargoIcon style={{ fontSize: 8, color: state === "elite" ? "#2A1E12" : tokens.ui.text }} />
        </Box>
      )}
    </Box>
  );
};

/** Berth states in loading order: elites and regiments ride before levies. */
const berthStates = (fleet: FleetInfo): ("empty" | "ship" | "regiment" | "elite" | "levy")[] => {
  const slots: ("empty" | "ship" | "regiment" | "elite" | "levy")[] = [];
  const elites = fleet.eliteRegiments ?? 0;
  for (let i = 0; i < fleet.skyships; i++) {
    if (i < elites) slots.push("elite");
    else if (i < elites + fleet.regiments) slots.push("regiment");
    else if (i < elites + fleet.regiments + fleet.levies) slots.push("levy");
    else slots.push("ship");
  }
  while (slots.length < MAX_SKYSHIPS_PER_FLEET) slots.push("empty");
  return slots.slice(0, MAX_SKYSHIPS_PER_FLEET);
};

export const FleetStrip = ({
  fleets,
  tileMap,
  deployableFleetIds,
  colour = tokens.ui.text,
  onDeploy,
  onViewLocation,
}: {
  fleets: FleetInfo[];
  tileMap: MyGameProps["G"]["mapState"]["currentTileArray"];
  deployableFleetIds: number[];
  /** Kingdom colour — the ships in the berths are yours */
  colour?: string;
  onDeploy?: (fleetId: number) => void;
  onViewLocation?: (location: number[]) => void;
}) => (
  <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, alignItems: "stretch", minWidth: 0 }}>
    {fleets.map((fleet) => {
      const atHome = fleet.location[0] === KINGDOM_LOCATION[0] && fleet.location[1] === KINGDOM_LOCATION[1];
      const isEmpty = fleet.skyships === 0;
      const placeName = atHome ? "Home Waters" : getLocationPresentation(tileMap, fleet.location).name;
      const canDeploy = !!onDeploy && deployableFleetIds.includes(fleet.fleetId);
      const { swords, shields } = fleetCombatValues(fleet);
      const status = isEmpty ? "empty" : fleet.dispatchedThisRound ? "dispatched" : atHome ? "at home" : "on station";

      return (
        <Tooltip
          key={fleet.fleetId}
          title={
            isEmpty
              ? "No skyships assigned — load this fleet from Manage"
              : `${fleet.skyships} of ${MAX_SKYSHIPS_PER_FLEET} berths crewed · ${swords} swords, ${shields} shields in battle`
          }
          placement="top"
          arrow
        >
          <Box
            onClick={onViewLocation ? () => onViewLocation(fleet.location) : undefined}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              px: "8px",
              py: "6px",
              flexShrink: 0,
              borderRadius: `${tokens.radius.md}px`,
              border: `1px solid ${canDeploy ? `${tokens.ui.gold}88` : tokens.ui.border}`,
              borderTop: `1px solid ${tokens.ui.gold}22`,
              background: isEmpty
                ? `${tokens.ui.surface}66`
                : `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
              boxShadow: canDeploy ? `0 0 8px ${tokens.ui.gold}22` : "inset 0 1px 0 rgba(255,255,255,0.3)",
              cursor: onViewLocation ? "pointer" : "default",
              transition: `all ${tokens.transition.fast}`,
              "&:hover": onViewLocation ? { borderColor: `${tokens.ui.gold}88` } : undefined,
            }}
          >
            {/* Name · where it is · what it's worth in a fight */}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1, flexShrink: 0 }}>
                {fleet.fleetId + 1}
              </Typography>
              <GiAnchor size={10} color={tokens.ui.textMuted} style={{ flexShrink: 0 }} />
              <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1, flex: 1, minWidth: 0 }}>
                {placeName}
              </Typography>
              {!isEmpty && (
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {swords}
                  <Box component="span" sx={{ color: tokens.ui.textMuted, fontWeight: 400 }}>⚔ </Box>
                  {shields}
                  <Box component="span" sx={{ color: tokens.ui.textMuted, fontWeight: 400 }}>🛡</Box>
                </Typography>
              )}
            </Box>

            {/* The Fleet box itself — five berths */}
            <Box sx={{ display: "flex", gap: "3px" }}>
              {berthStates(fleet).map((state, i) => (
                <Berth key={i} state={state} colour={colour} />
              ))}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", minHeight: 22 }}>
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
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", lineHeight: 1 }}>
                  {status}
                </Typography>
              )}
            </Box>
          </Box>
        </Tooltip>
      );
    })}
  </Box>
);
