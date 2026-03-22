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
  SLOTS_RECRUIT_COUNSELLORS,
  SLOTS_RECRUIT_REGIMENTS,
  SLOTS_PURCHASE_SKYSHIPS,
  SLOTS_FOUND_FACTORIES,
  SLOTS_CONVERT_MONARCH,
} from "@eots/game";

type RowConfig = {
  label: string;
  actionId: string;
  totalSlots: number;
  boardStateKey: string;
  moveName: string;
  moveExtraArgs?: unknown[];
  accent: string;
  bgImage: string;
};

const createRow = (config: RowConfig) => {
  const Row = (props: ActionBoardProps) => {
    const slotState = (props.G.boardState as Record<string, unknown>)[config.boardStateKey];
    return (
      <CollapsedActionRow
        label={config.label}
        cost=""
        actionId={config.actionId}
        images={[]}
        totalSlots={config.totalSlots}
        slotState={slotState as Record<number, string | string[] | undefined>}
        onPlace={(slot) => {
          clearMoves(props);
          const move = (props.moves as Record<string, (...args: unknown[]) => void>)[config.moveName];
          move(slot, ...(config.moveExtraArgs ?? []));
        }}
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
  totalSlots: SLOTS_RECRUIT_COUNSELLORS,
  boardStateKey: "recruitCounsellors",
  moveName: "recruitCounsellors",
  accent: "#6b7280",
  bgImage: BTN_BG.recruitCounsellors,
});

export const RecruitRegimentsRow = createRow({
  label: "Recruit Regiments",
  actionId: "recruit-regiments",
  totalSlots: SLOTS_RECRUIT_REGIMENTS,
  boardStateKey: "recruitRegiments",
  moveName: "recruitRegiments",
  accent: "#4b5563",
  bgImage: BTN_BG.recruitRegiments,
});

export const PurchaseSkyshipsZeelandRow = createRow({
  label: "Skyships (Zeeland)",
  actionId: "skyships-zeeland",
  totalSlots: SLOTS_PURCHASE_SKYSHIPS,
  boardStateKey: "purchaseSkyshipsZeeland",
  moveName: "purchaseSkyships",
  moveExtraArgs: ["zeeland"],
  accent: "#c77700",
  bgImage: BTN_BG.purchaseSkyshipsZeeland,
});

export const PurchaseSkyshipsVenoaRow = createRow({
  label: "Skyships (Venoa)",
  actionId: "skyships-venoa",
  totalSlots: SLOTS_PURCHASE_SKYSHIPS,
  boardStateKey: "purchaseSkyshipsVenoa",
  moveName: "purchaseSkyships",
  moveExtraArgs: ["venoa"],
  accent: "#b54785",
  bgImage: BTN_BG.purchaseSkyshipsVenoa,
});

export const FoundFactoriesRow = createRow({
  label: "Found Factories",
  actionId: "found-factories",
  totalSlots: SLOTS_FOUND_FACTORIES,
  boardStateKey: "foundFactories",
  moveName: "foundFactory",
  accent: "#8f6f34",
  bgImage: BTN_BG.foundFactory,
});

export const ConvertMonarchRow = createRow({
  label: "Convert Monarch",
  actionId: "convert-monarch",
  totalSlots: SLOTS_CONVERT_MONARCH,
  boardStateKey: "convertMonarch",
  moveName: "convertMonarch",
  accent: "#1e6091",
  bgImage: BTN_BG.convertMonarch,
});
