import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import {
  PURCHASE_SKYSHIPS_ZEELAND,
  PURCHASE_SKYSHIPS_VENOA,
} from "@/assets/actionBoard";

export const PurchaseSkyshipsZeelandRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Purchase Skyships (Zeeland)"
        meta={[
          { label: "Cost", value: "2g + row count" },
          { label: "Gain", value: "+2 skyships from Zeeland" },
          { label: "Max", value: "24" },
        ]}
        accent="#c77700"
      />
    }
  >
    {PURCHASE_SKYSHIPS_ZEELAND.map((image, i) => (
      <ActionBoardButton
        key={`zeeland-slot-${i}`}
        value={i}
        onClickFunction={(slot) =>
          props.moves.purchaseSkyships(slot, "zeeland")
        }
        backgroundImage={image}
        backgroundColour="#FE9F10"
        width="98px"
        counsellor={
          props.G.boardState.purchaseSkyshipsZeeland[
            (i + 1) as 1 | 2
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);

export const PurchaseSkyshipsVenoaRow = (props: ActionBoardProps) => (
  <ActionRow
    header={
      <RowHeader
        label="Purchase Skyships (Venoa)"
        meta={[
          { label: "Cost", value: "2g + row count" },
          { label: "Gain", value: "+2 skyships from Venoa" },
          { label: "Max", value: "24" },
        ]}
        accent="#b54785"
      />
    }
  >
    {PURCHASE_SKYSHIPS_VENOA.map((image, i) => (
      <ActionBoardButton
        key={`venoa-slot-${i}`}
        value={i}
        onClickFunction={(slot) =>
          props.moves.purchaseSkyships(slot, "venoa")
        }
        backgroundImage={image}
        backgroundColour="#FE9ACC"
        width="98px"
        counsellor={
          props.G.boardState.purchaseSkyshipsVenoa[
            (i + 1) as 1 | 2
          ]
        }
        requires={{ gold: true }}
        {...props}
      />
    ))}
  </ActionRow>
);
