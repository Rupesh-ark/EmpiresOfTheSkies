/**
 * DecisionRouter — non-modal decision panels, pinned to the top of the
 * action column (via GameLayout's decision slot) instead of blocking the
 * screen as dialogs or covering the map as floating cards.
 *
 * Everything the game actively waits on lands in one place, and the map
 * stays whole — which matters most for combat, where the player needs to
 * see the battle tile. Takeover ceremonies (battle results, elections,
 * round summaries) stay in DialogRouter.
 */
import { memo, lazy, Suspense } from "react";
import { MyGameProps, phaseGroup } from "@eots/game";

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
const InvasionFoWDialog = lazy(() => import("./Events/InvasionFoWDialog").then(m => ({ default: m.default })));
const OutpostOrColonyDialog = lazy(() => import("./Conquests/OutpostOrColonyDialog").then(m => ({ default: m.default })));
const RetrieveFleetsDialog = lazy(() => import("./Resolution/RetrieveFleetsDialog").then(m => ({ default: m.default })));

export const DecisionRouter = memo((props: MyGameProps) => {
  const sub = props.G.step;
  const phase = phaseGroup(props.ctx.phase!);

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

      {(sub === "invasion_aerial_fow" || sub === "invasion_ground_fow") && (
        <Suspense fallback={null}>
          {/* Keyed per stage: a hand selection from the aerial stage must not
              survive the splice into the ground stage's fresh decision. */}
          <InvasionFoWDialog key={sub} {...props} />
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
