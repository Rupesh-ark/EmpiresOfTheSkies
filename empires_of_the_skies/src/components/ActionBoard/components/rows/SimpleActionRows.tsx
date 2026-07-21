/**
 * SimpleActionRows — config-driven factory for identical CollapsedActionRow wrappers.
 *
 * Each row previously lived in its own file with the exact same structure.
 * This consolidates RecruitCounsellors, RecruitRegiments, PurchaseSkyships (×2),
 * FoundFactories, and ConvertMonarch into a single declarative config.
 */
import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import {
  MOVE_DEFINITIONS,
  getNextSlotCost,
  CONVERT_MONARCH_GOLD_COST,
  type SlottedActionKey,
} from "@eots/game";

type RowConfig = {
  label: string;
  actionId: string;
  boardStateKey: string;
  moveName: string;
  moveExtraArgs?: unknown[];
  accent: string;
  bgImage: string;
  /** Flat gold cost for non-stacking rows; stacking rows derive from boardStateKey */
  fixedCostGold?: number;
};

const createRow = (config: RowConfig) => {
  const Row = (props: ActionBoardProps) => {
    const slotState = (props.G.boardState as Record<string, unknown>)[config.boardStateKey];
    const player = props.playerID ? props.G.playerInfo[props.playerID] : undefined;

    // Same validator the server runs — disabled state and reason can't drift.
    const validate = MOVE_DEFINITIONS[config.moveName]?.validate;
    const moveError =
      props.isActive && props.playerID && validate
        ? validate(props.G, props.playerID, ...(config.moveExtraArgs ?? []))
        : null;

    const costGold =
      config.fixedCostGold ??
      getNextSlotCost(props.G, config.boardStateKey as SlottedActionKey);

    return (
      <CollapsedActionRow
        label={config.label}
        cost=""
        actionId={config.actionId}
        images={[]}
        slotState={slotState as string[]}
        onPlace={() => {
          clearMoves(props);
          const move = (props.moves as Record<string, (...args: unknown[]) => void>)[config.moveName];
          move(...(config.moveExtraArgs ?? []));
        }}
        disabled={!!moveError}
        disabledReason={moveError?.message}
        costGold={costGold}
        playerGold={player?.resources.gold}
        playerInfo={props.G.playerInfo}
        accent={config.accent}
        bgImage={config.bgImage}
      />
    );
  };
  Row.displayName = config.label.replace(/\s/g, "");
  return Row;
};

export const RecruitCounsellorsRow = createRow({
  label: "Recruit Counsellors",
  actionId: "recruit-counsellors",
  boardStateKey: "recruitCounsellors",
  moveName: "recruitCounsellors",
  accent: "#6b7280",
  bgImage: BTN_BG.recruitCounsellors,
});

export const RecruitRegimentsRow = createRow({
  label: "Recruit Regiments",
  actionId: "recruit-regiments",
  boardStateKey: "recruitRegiments",
  moveName: "recruitRegiments",
  accent: "#4b5563",
  bgImage: BTN_BG.recruitRegiments,
});

export const PurchaseSkyshipsZeelandRow = createRow({
  label: "Skyships (Zeeland)",
  actionId: "skyships-zeeland",
  boardStateKey: "purchaseSkyshipsZeeland",
  moveName: "purchaseSkyships",
  moveExtraArgs: ["zeeland"],
  accent: "#c77700",
  bgImage: BTN_BG.purchaseSkyshipsZeeland,
});

export const PurchaseSkyshipsVenoaRow = createRow({
  label: "Skyships (Venoa)",
  actionId: "skyships-venoa",
  boardStateKey: "purchaseSkyshipsVenoa",
  moveName: "purchaseSkyships",
  moveExtraArgs: ["venoa"],
  accent: "#b54785",
  bgImage: BTN_BG.purchaseSkyshipsVenoa,
});

export const FoundFactoriesRow = createRow({
  label: "Found Factories",
  actionId: "found-factories",
  boardStateKey: "foundFactories",
  moveName: "foundFactory",
  accent: "#8f6f34",
  bgImage: BTN_BG.foundFactory,
});

export const ConvertMonarchRow = createRow({
  label: "Convert Monarch",
  actionId: "convert-monarch",
  boardStateKey: "convertMonarch",
  moveName: "convertMonarch",
  accent: "#1e6091",
  bgImage: BTN_BG.convertMonarch,
  fixedCostGold: CONVERT_MONARCH_GOLD_COST,
});
