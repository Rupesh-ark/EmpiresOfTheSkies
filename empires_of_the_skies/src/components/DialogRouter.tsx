import { memo } from "react";
import { MyGameProps } from "@eots/game";

import RoundSummaryDialog from "./Resolution/RoundSummaryDialog";
import PickKingdomAdvantageCardDialog from "./Cards/PickKingdomAdvantageCardDialog";
import PickEventCardDialog from "./Events/PickEventCardDialog";
import EventChoiceDialog from "./Events/EventChoiceDialog";
import PickLegacyCardDialog from "./Cards/PickLegacyCardDialog";
import AttackOrPassDiaLog from "./AerialBattle/AttackOrPassDialog";
import AttackOrEvadeDialog from "./AerialBattle/AttackOrEvadeDialog";
import DrawOrPickCardDialog from "./AerialBattle/DrawOrPickCardDialog";
import BattleResultDialog from "./AerialBattle/BattleResultDialog";
import RelocateLoserDialog from "./AerialBattle/RelocateLoserDialog";
import PlunderLegendsDialog from "./PlunderLegends/PlunderLegendsDialog";
import GroundAttackOrPassDialog from "./GroundBattle/GroundAttackOrPassDialog";
import DefendOrYieldDialog from "./GroundBattle/DefendOrYieldDialog";
import GarrisonTroopsDialog from "./GroundBattle/GarrisonTroopsDialog";
import OutpostOrColonyDialog from "./Conquests/OutpostOrColonyDialog";
import InfidelFleetCombatDialog from "./Events/InfidelFleetCombatDialog";
import DeferredBattleDialog from "./Events/DeferredBattleDialog";
import RebellionDialog from "./Events/RebellionDialog";
import RebellionRivalSupportDialog from "./Events/RebellionRivalSupportDialog";
import InvasionNominateDialog from "./Events/InvasionNominateDialog";
import InvasionContributeDialog from "./Events/InvasionContributeDialog";
import InvasionBuyoffDialog from "./Events/InvasionBuyoffDialog";
import RetrieveFleetsDialog from "./Resolution/RetrieveFleetsDialog";
import ElectionDialog from "./Election/ElectionDialog";
import DiscardFoWCardDialog from "./Cards/DiscardFoWCardDialog";
import ConfirmDrawDialog from "./Cards/ConfirmDrawDialog";
import GameOverView from "./GameOverView";

/**
 * DialogRouter
 *
 * Renders all game-phase dialogs in one place, keyed off G.stage.phase and G.stage.sub.
 * The discriminated union on G.stage makes every sub-stage unique — no ctx.phase needed.
 *
 * Rule: do NOT add layout, tabs, or non-dialog UI here.
 * Rule: do NOT modify the individual dialog components — only their mount conditions.
 */
export const DialogRouter = memo((props: MyGameProps) => {
  const { sub } = props.G.stage;

  return (
    <>
      <RoundSummaryDialog {...props} />

      {props.G.stage.sub === "kingdom_advantage" && (
        <PickKingdomAdvantageCardDialog {...props} />
      )}

      {props.G.stage.phase === "events" && props.G.stage.sub === "default" && (
        <>
          <PickEventCardDialog {...props} />
          <EventChoiceDialog {...props} />
        </>
      )}

      {sub === "legacy_card" && (
        <PickLegacyCardDialog {...props} />
      )}

      {sub === "aerial_attack_or_pass" && (
        <AttackOrPassDiaLog {...props} />
      )}

      {sub === "aerial_attack_or_evade" && (
        <AttackOrEvadeDialog {...props} />
      )}

      {/* BattleResultDialog manages its own open state — shows after any battle resolves */}
      <BattleResultDialog {...props} />

      {/* DrawOrPickCardDialog manages its own open state internally */}
      <DrawOrPickCardDialog {...props} />

      {(sub === "aerial_relocate" || sub === "ground_relocate") && (
        <RelocateLoserDialog {...props} />
      )}

      {sub === "plunder_legends" && (
        <PlunderLegendsDialog {...props} />
      )}

      {sub === "ground_attack_or_pass" && (
        <GroundAttackOrPassDialog {...props} />
      )}

      {sub === "ground_defend_or_yield" && (
        <DefendOrYieldDialog {...props} />
      )}

      {(sub === "ground_garrison" || sub === "conquest_garrison") && (
        <GarrisonTroopsDialog {...props} />
      )}

      {sub === "conquest" && (
        <OutpostOrColonyDialog {...props} />
      )}

      {sub === "infidel_fleet_combat" && (
        <InfidelFleetCombatDialog {...props} />
      )}

      {sub === "deferred_battle" && (
        <DeferredBattleDialog {...props} />
      )}

      {sub === "rebellion" && (
        <RebellionDialog {...props} />
      )}

      {sub === "rebellion_rival_support" && (
        <RebellionRivalSupportDialog {...props} />
      )}

      {sub === "invasion_nominate" && (
        <InvasionNominateDialog {...props} />
      )}

      {sub === "invasion_contribute" && (
        <InvasionContributeDialog {...props} />
      )}

      {sub === "invasion_buyoff" && (
        <InvasionBuyoffDialog {...props} />
      )}

      {sub === "retrieve_fleets" && (
        <RetrieveFleetsDialog {...props} />
      )}

      {sub === "election" && <ElectionDialog {...props} />}

      {sub === "immediate_election" && <ElectionDialog {...props} immediate />}

      {sub === "confirm_fow_draw" && <ConfirmDrawDialog {...props} />}

      {sub === "discard_fow" && <DiscardFoWCardDialog {...props} />}

      <GameOverView {...props} />
    </>
  );
});
