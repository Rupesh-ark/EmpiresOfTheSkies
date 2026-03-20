import { ActionBoardProps } from "../shared";
import { PURCHASE_SKYSHIPS_ZEELAND, PURCHASE_SKYSHIPS_VENOA } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import { clearMoves } from "@/utils/gameHelpers";
import { SLOTS_PURCHASE_SKYSHIPS } from "@eots/game";

export const PurchaseSkyshipsZeelandRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Purchase Skyships (Zeeland)"
    cost="2g + row count → +2 skyships"
    images={PURCHASE_SKYSHIPS_ZEELAND}
    totalSlots={SLOTS_PURCHASE_SKYSHIPS}
    slotState={props.G.boardState.purchaseSkyshipsZeeland}
    onPlace={(slot) => { clearMoves(props); props.moves.purchaseSkyships(slot, "zeeland"); }}
    playerInfo={props.G.playerInfo}
    accent="#c77700"
  />
);

export const PurchaseSkyshipsVenoaRow = (props: ActionBoardProps) => (
  <CollapsedActionRow
    label="Purchase Skyships (Venoa)"
    cost="2g + row count → +2 skyships"
    images={PURCHASE_SKYSHIPS_VENOA}
    totalSlots={SLOTS_PURCHASE_SKYSHIPS}
    slotState={props.G.boardState.purchaseSkyshipsVenoa}
    onPlace={(slot) => { clearMoves(props); props.moves.purchaseSkyships(slot, "venoa"); }}
    playerInfo={props.G.playerInfo}
    accent="#b54785"
  />
);
