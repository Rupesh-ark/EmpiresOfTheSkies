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
const PickEventCardDialog = lazy(() => import("./Events/PickEventCardDialog").then(m => ({ default: m.default })));
const EventChoiceDialog = lazy(() => import("./Events/EventChoiceDialog").then(m => ({ default: m.default })));
const PickLegacyCardDialog = lazy(() => import("./Cards/PickLegacyCardDialog").then(m => ({ default: m.default })));
const AttackOrPassDialog = lazy(() => import("./AerialBattle/AttackOrPassDialog").then(m => ({ default: m.default })));
const AttackOrEvadeDialog = lazy(() => import("./AerialBattle/AttackOrEvadeDialog").then(m => ({ default: m.default })));
const RelocateLoserDialog = lazy(() => import("./AerialBattle/RelocateLoserDialog").then(m => ({ default: m.default })));
const PlunderLegendsDialog = lazy(() => import("./PlunderLegends/PlunderLegendsDialog").then(m => ({ default: m.default })));
const GroundAttackOrPassDialog = lazy(() => import("./GroundBattle/GroundAttackOrPassDialog").then(m => ({ default: m.default })));
const DefendOrYieldDialog = lazy(() => import("./GroundBattle/DefendOrYieldDialog").then(m => ({ default: m.default })));
const GarrisonTroopsDialog = lazy(() => import("./GroundBattle/GarrisonTroopsDialog").then(m => ({ default: m.default })));
const OutpostOrColonyDialog = lazy(() => import("./Conquests/OutpostOrColonyDialog").then(m => ({ default: m.default })));
const InfidelFleetCombatDialog = lazy(() => import("./Events/InfidelFleetCombatDialog").then(m => ({ default: m.default })));
const DeferredBattleDialog = lazy(() => import("./Events/DeferredBattleDialog").then(m => ({ default: m.default })));
const RebellionDialog = lazy(() => import("./Events/RebellionDialog").then(m => ({ default: m.default })));
const RebellionRivalSupportDialog = lazy(() => import("./Events/RebellionRivalSupportDialog").then(m => ({ default: m.default })));
const InvasionNominateDialog = lazy(() => import("./Events/InvasionNominateDialog").then(m => ({ default: m.default })));
const InvasionContributeDialog = lazy(() => import("./Events/InvasionContributeDialog").then(m => ({ default: m.default })));
const InvasionBuyoffDialog = lazy(() => import("./Events/InvasionBuyoffDialog").then(m => ({ default: m.default })));
const RetrieveFleetsDialog = lazy(() => import("./Resolution/RetrieveFleetsDialog").then(m => ({ default: m.default })));
const ElectionDialog = lazy(() => import("./Election/ElectionDialog").then(m => ({ default: m.default })));
const DiscardFoWCardDialog = lazy(() => import("./Cards/DiscardFoWCardDialog").then(m => ({ default: m.default })));
const ConfirmDrawDialog = lazy(() => import("./Cards/ConfirmDrawDialog").then(m => ({ default: m.default })));

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
  const { sub, phase } = props.G.stage;

  return (
    <>
      {/* Always rendered (static import) */}
      <RoundSummaryDialog {...props} />

      {sub === "kingdom_advantage" && (
        <Suspense fallback={<DialogLoader name="Kingdom Advantage" />}>
          <PickKingdomAdvantageCardDialog {...props} />
        </Suspense>
      )}

      {phase === "events" && sub === "default" && (
        <Suspense fallback={<DialogLoader name="Event Cards" />}>
          <PickEventCardDialog {...props} />
          <EventChoiceDialog {...props} />
        </Suspense>
      )}

      {sub === "legacy_card" && (
        <Suspense fallback={<DialogLoader name="Legacy Card" />}>
          <PickLegacyCardDialog {...props} />
        </Suspense>
      )}

      {sub === "aerial_attack_or_pass" && (
        <Suspense fallback={<DialogLoader name="Aerial Battle" />}>
          <AttackOrPassDialog {...props} />
        </Suspense>
      )}

      {sub === "aerial_attack_or_evade" && (
        <Suspense fallback={<DialogLoader name="Evade Decision" />}>
          <AttackOrEvadeDialog {...props} />
        </Suspense>
      )}

      {/* BattleResultDialog and DrawOrPickCardDialog manage their own open state (static import) */}
      <BattleResultDialog {...props} />
      <DrawOrPickCardDialog {...props} />

      {sub === "relocate_loser" && (
        <Suspense fallback={<DialogLoader name="Fleet Relocation" />}>
          <RelocateLoserDialog {...props} />
        </Suspense>
      )}

      {sub === "plunder_legends" && (
        <Suspense fallback={<DialogLoader name="Plunder" />}>
          <PlunderLegendsDialog {...props} />
        </Suspense>
      )}

      {sub === "ground_attack_or_pass" && (
        <Suspense fallback={<DialogLoader name="Ground Attack" />}>
          <GroundAttackOrPassDialog {...props} />
        </Suspense>
      )}

      {sub === "ground_defend_or_yield" && (
        <Suspense fallback={<DialogLoader name="Defend/Yield" />}>
          <DefendOrYieldDialog {...props} />
        </Suspense>
      )}

      {(sub === "ground_garrison" || sub === "conquest_garrison") && (
        <Suspense fallback={<DialogLoader name="Garrison" />}>
          <GarrisonTroopsDialog {...props} />
        </Suspense>
      )}

      {sub === "conquest" && (
        <Suspense fallback={<DialogLoader name="Conquest" />}>
          <OutpostOrColonyDialog {...props} />
        </Suspense>
      )}

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

      {sub === "rebellion" && (
        <Suspense fallback={<DialogLoader name="Rebellion" />}>
          <RebellionDialog {...props} />
        </Suspense>
      )}

      {sub === "rebellion_rival_support" && (
        <Suspense fallback={<DialogLoader name="Rebellion Support" />}>
          <RebellionRivalSupportDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_nominate" && (
        <Suspense fallback={<DialogLoader name="Invasion Nomination" />}>
          <InvasionNominateDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_contribute" && (
        <Suspense fallback={<DialogLoader name="Invasion Contribution" />}>
          <InvasionContributeDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_buyoff" && (
        <Suspense fallback={<DialogLoader name="Invasion Buyoff" />}>
          <InvasionBuyoffDialog {...props} />
        </Suspense>
      )}

      {sub === "retrieve_fleets" && (
        <Suspense fallback={<DialogLoader name="Fleet Retrieval" />}>
          <RetrieveFleetsDialog {...props} />
        </Suspense>
      )}

      {(sub === "election" || sub === "immediate_election") && (
        <Suspense fallback={<DialogLoader name="Election" />}>
          <ElectionDialog {...props} immediate={sub === "immediate_election"} />
        </Suspense>
      )}

      {sub === "confirm_fow_draw" && (
        <Suspense fallback={<DialogLoader name="Draw Cards" />}>
          <ConfirmDrawDialog {...props} />
        </Suspense>
      )}

      {sub === "discard_fow" && (
        <Suspense fallback={<DialogLoader name="Discard Cards" />}>
          <DiscardFoWCardDialog {...props} />
        </Suspense>
      )}

      {/* GameOverView manages its own open state (static import) */}
      <GameOverView {...props} />
    </>
  );
});
