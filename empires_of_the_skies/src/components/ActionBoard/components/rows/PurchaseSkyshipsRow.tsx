import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_PURCHASE_SKYSHIPS } from "@eots/game";

export const PurchaseSkyshipsZeelandRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Skyships (Zeeland)"
    cost=""
    actionId="skyships-zeeland"
    images={[]}
    totalSlots={SLOTS_PURCHASE_SKYSHIPS}
    slotState={props.G.boardState.purchaseSkyshipsZeeland}
    onPlace={(slot) => { clearMoves(props); props.moves.purchaseSkyships(slot, "zeeland"); }}
    playerInfo={props.G.playerInfo}
    accent="#c77700"
    bgImage={BTN_BG.purchaseSkyshipsZeeland}
  />
);

export const PurchaseSkyshipsVenoaRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Skyships (Venoa)"
    cost=""
    actionId="skyships-venoa"
    images={[]}
    totalSlots={SLOTS_PURCHASE_SKYSHIPS}
    slotState={props.G.boardState.purchaseSkyshipsVenoa}
    onPlace={(slot) => { clearMoves(props); props.moves.purchaseSkyships(slot, "venoa"); }}
    playerInfo={props.G.playerInfo}
    accent="#b54785"
    bgImage={BTN_BG.purchaseSkyshipsVenoa}
  />
);
