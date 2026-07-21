/**
 * DecisionRouter — non-modal decision panels that float over the map
 * (via GameLayout's decision slot) instead of blocking it as dialogs.
 *
 * Combat prompts live here: the player needs to SEE the battle tile and
 * the surrounding board to decide. Takeover ceremonies (battle results,
 * elections, round summaries) stay in DialogRouter.
 */
import { memo, lazy, Suspense } from "react";
import { MyGameProps } from "@eots/game";

const AttackOrPassDialog = lazy(() => import("./AerialBattle/AttackOrPassDialog").then(m => ({ default: m.default })));
const AttackOrEvadeDialog = lazy(() => import("./AerialBattle/AttackOrEvadeDialog").then(m => ({ default: m.default })));
const GroundAttackOrPassDialog = lazy(() => import("./GroundBattle/GroundAttackOrPassDialog").then(m => ({ default: m.default })));
const DefendOrYieldDialog = lazy(() => import("./GroundBattle/DefendOrYieldDialog").then(m => ({ default: m.default })));
const PickEventCardDialog = lazy(() => import("./Events/PickEventCardDialog").then(m => ({ default: m.default })));
const EventChoiceDialog = lazy(() => import("./Events/EventChoiceDialog").then(m => ({ default: m.default })));
const ConfirmDrawDialog = lazy(() => import("./Cards/ConfirmDrawDialog").then(m => ({ default: m.default })));
const DiscardFoWCardDialog = lazy(() => import("./Cards/DiscardFoWCardDialog").then(m => ({ default: m.default })));
const RelocateLoserDialog = lazy(() => import("./AerialBattle/RelocateLoserDialog").then(m => ({ default: m.default })));
const RebellionDialog = lazy(() => import("./Events/RebellionDialog").then(m => ({ default: m.default })));
const RebellionRivalSupportDialog = lazy(() => import("./Events/RebellionRivalSupportDialog").then(m => ({ default: m.default })));
const InvasionNominateDialog = lazy(() => import("./Events/InvasionNominateDialog").then(m => ({ default: m.default })));
const InvasionContributeDialog = lazy(() => import("./Events/InvasionContributeDialog").then(m => ({ default: m.default })));
const InvasionBuyoffDialog = lazy(() => import("./Events/InvasionBuyoffDialog").then(m => ({ default: m.default })));
const OutpostOrColonyDialog = lazy(() => import("./Conquests/OutpostOrColonyDialog").then(m => ({ default: m.default })));
const RetrieveFleetsDialog = lazy(() => import("./Resolution/RetrieveFleetsDialog").then(m => ({ default: m.default })));

export const DecisionRouter = memo((props: MyGameProps) => {
  const { sub, phase } = props.G.stage;

  return (
    <>
      {phase === "events" && sub === "default" && (
        <Suspense fallback={null}>
          <PickEventCardDialog {...props} />
          <EventChoiceDialog {...props} />
        </Suspense>
      )}

      {sub === "confirm_fow_draw" && (
        <Suspense fallback={null}>
          <ConfirmDrawDialog {...props} />
        </Suspense>
      )}

      {sub === "discard_fow" && (
        <Suspense fallback={null}>
          <DiscardFoWCardDialog {...props} />
        </Suspense>
      )}
      {sub === "aerial_attack_or_pass" && (
        <Suspense fallback={null}>
          <AttackOrPassDialog {...props} />
        </Suspense>
      )}

      {sub === "aerial_attack_or_evade" && (
        <Suspense fallback={null}>
          <AttackOrEvadeDialog {...props} />
        </Suspense>
      )}

      {sub === "ground_attack_or_pass" && (
        <Suspense fallback={null}>
          <GroundAttackOrPassDialog {...props} />
        </Suspense>
      )}

      {sub === "ground_defend_or_yield" && (
        <Suspense fallback={null}>
          <DefendOrYieldDialog {...props} />
        </Suspense>
      )}

      {/* Headless controller — drives main-map selection for relocating the loser */}
      {sub === "relocate_loser" && (
        <Suspense fallback={null}>
          <RelocateLoserDialog {...props} />
        </Suspense>
      )}

      {sub === "rebellion" && (
        <Suspense fallback={null}>
          <RebellionDialog {...props} />
        </Suspense>
      )}

      {sub === "rebellion_rival_support" && (
        <Suspense fallback={null}>
          <RebellionRivalSupportDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_nominate" && (
        <Suspense fallback={null}>
          <InvasionNominateDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_contribute" && (
        <Suspense fallback={null}>
          <InvasionContributeDialog {...props} />
        </Suspense>
      )}

      {sub === "invasion_buyoff" && (
        <Suspense fallback={null}>
          <InvasionBuyoffDialog {...props} />
        </Suspense>
      )}

      {sub === "conquest" && (
        <Suspense fallback={null}>
          <OutpostOrColonyDialog {...props} />
        </Suspense>
      )}

      {sub === "retrieve_fleets" && (
        <Suspense fallback={null}>
          <RetrieveFleetsDialog {...props} />
        </Suspense>
      )}
    </>
  );
});
