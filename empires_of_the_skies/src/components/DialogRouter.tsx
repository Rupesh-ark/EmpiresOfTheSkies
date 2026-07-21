import { memo, lazy, Suspense } from "react";
import { MyGameProps } from "@eots/game";
import { Box, CircularProgress, Typography } from "@mui/material";

// Always-rendered dialogs (static imports)
import RoundSummaryDialog from "./Resolution/RoundSummaryDialog";
import BattleResultDialog from "./AerialBattle/BattleResultDialog";
import DrawOrPickCardDialog from "./AerialBattle/DrawOrPickCardDialog";
import GameOverView from "./GameOverView";

// Lazily-loaded dialogs (code-split)
const PickKingdomAdvantageCardDialog = lazy(() => import("./Cards/PickKingdomAdvantageCardDialog").then(m => ({ default: m.default })));
const PickLegacyCardDialog = lazy(() => import("./Cards/PickLegacyCardDialog").then(m => ({ default: m.default })));
const PlunderLegendsDialog = lazy(() => import("./PlunderLegends/PlunderLegendsDialog").then(m => ({ default: m.default })));
const GarrisonTroopsDialog = lazy(() => import("./GroundBattle/GarrisonTroopsDialog").then(m => ({ default: m.default })));
const InfidelFleetCombatDialog = lazy(() => import("./Events/InfidelFleetCombatDialog").then(m => ({ default: m.default })));
const DeferredBattleDialog = lazy(() => import("./Events/DeferredBattleDialog").then(m => ({ default: m.default })));
const ElectionDialog = lazy(() => import("./Election/ElectionDialog").then(m => ({ default: m.default })));

/**
 * Loading fallback for lazy dialogs
 */
const DialogLoader: React.FC<{ name: string }> = ({ name }) => (
  <Box sx={{ 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center",
    p: 4,
    gap: 2,
  }}>
    <CircularProgress size={32} />
    <Typography variant="body2" color="text.secondary">
      Loading {name}...
    </Typography>
  </Box>
);

/**
 * DialogRouter
 *
 * Renders game-phase dialogs with code-splitting via React.lazy().
 * Always-rendered dialogs (RoundSummary, BattleResult, etc.) use static imports.
 * Phase-specific dialogs are lazy-loaded only when needed.
 *
 * Rule: do NOT add layout, tabs, or non-dialog UI here.
 * Rule: do NOT modify the individual dialog components — only their mount conditions.
 */
export const DialogRouter = memo((props: MyGameProps) => {
  const { sub } = props.G.stage;

  return (
    <>
      {/* Always rendered (static import) */}
      <RoundSummaryDialog {...props} />

      {sub === "kingdom_advantage" && (
        <Suspense fallback={<DialogLoader name="Kingdom Advantage" />}>
          <PickKingdomAdvantageCardDialog {...props} />
        </Suspense>
      )}

      {/* Event card pick + event choices are non-modal hand strips — see DecisionRouter. */}

      {sub === "legacy_card" && (
        <Suspense fallback={<DialogLoader name="Legacy Card" />}>
          <PickLegacyCardDialog {...props} />
        </Suspense>
      )}

      {/* Combat prompts (attack/pass, attack/evade, ground attack, defend/yield)
          are non-modal DecisionPanels — see DecisionRouter. */}

      {/* BattleResultDialog and DrawOrPickCardDialog manage their own open state (static import) */}
      <BattleResultDialog {...props} />
      <DrawOrPickCardDialog {...props} />

      {/* Relocate-loser is a headless map-selection controller — see DecisionRouter. */}

      {sub === "plunder_legends" && (
        <Suspense fallback={<DialogLoader name="Plunder" />}>
          <PlunderLegendsDialog {...props} />
        </Suspense>
      )}

      {(sub === "ground_garrison" || sub === "conquest_garrison") && (
        <Suspense fallback={<DialogLoader name="Garrison" />}>
          <GarrisonTroopsDialog {...props} />
        </Suspense>
      )}

      {/* Conquest (outpost/colony/pass) is a non-modal DecisionPanel — see DecisionRouter. */}

      {sub === "infidel_fleet_combat" && (
        <Suspense fallback={<DialogLoader name="Infidel Fleet" />}>
          <InfidelFleetCombatDialog {...props} />
        </Suspense>
      )}

      {sub === "deferred_battle" && (
        <Suspense fallback={<DialogLoader name="Deferred Battle" />}>
          <DeferredBattleDialog {...props} />
        </Suspense>
      )}

      {/* Rebellion + invasion prompts are non-modal DecisionPanels — see DecisionRouter. */}

      {/* Fleet retrieval is a non-modal DecisionPanel — see DecisionRouter. */}

      {(sub === "election" || sub === "immediate_election") && (
        <Suspense fallback={<DialogLoader name="Election" />}>
          <ElectionDialog {...props} immediate={sub === "immediate_election"} />
        </Suspense>
      )}

      {/* FoW draw/discard are non-modal DecisionPanels — see DecisionRouter. */}

      {/* GameOverView manages its own open state (static import) */}
      <GameOverView {...props} />
    </>
  );
});
