import { MyGameProps } from "@eots/game";

import RoundSummaryDialog from "./RoundSummaryDialog";
import PickKingdomAdvantageCardDialog from "./PickKingdomAdvantageCardDialog";
import PickEventCardDialog from "./PickEventCardDialog";
import EventChoiceDialog from "./EventChoiceDialog";
import PickLegacyCardDialog from "./PickLegacyCardDialog";
import AttackOrPassDiaLog from "./AerialBattle/AttackOrPassDialog";
import AttackOrEvadeDialog from "./AerialBattle/AttackOrEvadeDialog";
import DrawOrPickCardDialog from "./AerialBattle/DrawOrPickCardDialog";
import RelocateLoserDialog from "./AerialBattle/RelocateLoserDialog";
import PlunderLegendsDialog from "./PlunderLegends/PlunderLegendsDialog";
import GroundAttackOrPassDialog from "./GroundBattle/GroundAttackOrPassDialog";
import DefendOrYieldDialog from "./GroundBattle/DefendOrYieldDialog";
import GarrisonTroopsDialog from "./GroundBattle/GarrisonTroopsDialog";
import OutpostOrColonyDialog from "./Conquests/OutpostOrColonyDialog";
import InfidelFleetCombatDialog from "./InfidelFleetCombatDialog";
import DeferredBattleDialog from "./DeferredBattleDialog";
import RebellionDialog from "./RebellionDialog";
import RebellionRivalSupportDialog from "./RebellionRivalSupportDialog";
import InvasionNominateDialog from "./InvasionNominateDialog";
import InvasionContributeDialog from "./InvasionContributeDialog";
import InvasionBuyoffDialog from "./InvasionBuyoffDialog";
import RetrieveFleetsDialog from "./Resolution/RetrieveFleetsDialog";
import ElectionDialog from "./Election/ElectionDialog";
import GameOverView from "./GameOverView";

/**
 * DialogRouter
 *
 * Renders all game-phase dialogs in one place, keyed off G.stage and ctx.phase.
 * Previously these 22+ conditional blocks lived inline in ActionBoardsAndMap.tsx.
 * Moving them here keeps ActionBoardsAndMap focused on layout while this component
 * owns the dialog routing logic.
 *
 * Rule: do NOT add layout, tabs, or non-dialog UI here.
 * Rule: do NOT modify the individual dialog components — only their mount conditions.
 */
export const DialogRouter = (props: MyGameProps) => {
  return (
    <>
      <RoundSummaryDialog {...props} />

      {props.ctx.phase === "kingdom_advantage" && (
        <PickKingdomAdvantageCardDialog {...props} />
      )}

      {props.G.stage === "events" && (
        <>
          <PickEventCardDialog {...props} />
          <EventChoiceDialog {...props} />
        </>
      )}

      {props.G.stage === "pick legacy card" && (
        <PickLegacyCardDialog {...props} />
      )}

      {props.G.stage === "attack or pass" && (
        <AttackOrPassDiaLog {...props} />
      )}

      {props.G.stage === "attack or evade" && (
        <AttackOrEvadeDialog {...props} />
      )}

      {/* DrawOrPickCardDialog manages its own open state internally */}
      <DrawOrPickCardDialog {...props} />

      {props.G.stage === "relocate loser" && (
        <RelocateLoserDialog {...props} />
      )}

      {props.G.stage === "plunder legends" && (
        <PlunderLegendsDialog {...props} />
      )}

      {props.G.stage === "attack or pass" && (
        <GroundAttackOrPassDialog {...props} />
      )}

      {props.G.stage === "defend or yield" && (
        <DefendOrYieldDialog {...props} />
      )}

      {props.G.stage === "garrison troops" && (
        <GarrisonTroopsDialog {...props} />
      )}

      {props.G.stage === "conquest" && (
        <OutpostOrColonyDialog {...props} />
      )}

      {props.G.stage === "infidel_fleet_combat" && (
        <InfidelFleetCombatDialog {...props} />
      )}

      {props.G.stage === "deferred_battle" && (
        <DeferredBattleDialog {...props} />
      )}

      {props.G.stage === "rebellion" && (
        <RebellionDialog {...props} />
      )}

      {props.G.stage === "rebellion_rival_support" && (
        <RebellionRivalSupportDialog {...props} />
      )}

      {props.G.stage === "invasion_nominate" && (
        <InvasionNominateDialog {...props} />
      )}

      {props.G.stage === "invasion_contribute" && (
        <InvasionContributeDialog {...props} />
      )}

      {props.G.stage === "invasion_buyoff" && (
        <InvasionBuyoffDialog {...props} />
      )}

      {props.G.stage === "retrieve fleets" && (
        <RetrieveFleetsDialog {...props} />
      )}

      {props.ctx.phase === "election" && <ElectionDialog {...props} />}

      <GameOverView {...props} />
    </>
  );
};
