import { useState } from "react";
import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import {
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  PUNISH_EXECUTE_VP_COST,
  MOVE_DEFINITIONS,
} from "@eots/game";
import { Stack, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { clearMoves } from "@/utils/gameHelpers";

type PaymentType = "gold" | "counsellor" | "execute";

const PunishDissentersRow = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [count, setCount] = useState(1);

  const player = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const maxPrisoners =
    player?.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;

  // Same validator the server runs — per payment type and count, so button
  // states and reasons can't drift from what the move will actually accept.
  const rejectionFor = (paymentType: PaymentType, n: number) =>
    props.playerID
      ? MOVE_DEFINITIONS.punishDissenters?.validate?.(props.G, props.playerID, 0, paymentType, n) ?? null
      : { code: "NO_PLAYER", message: "Spectators cannot act" };

  const anyPaymentLegal = (["gold", "counsellor", "execute"] as PaymentType[]).some(
    (p) => rejectionFor(p, 1) === null
  );
  const rowRejection = anyPaymentLegal ? null : rejectionFor("gold", 1);

  const handlePay = (paymentType: PaymentType) => {
    props.moves.punishDissenters(0, paymentType, count);
    setDialogOpen(false);
    setCount(1);
  };

  return (
    <>
      <CollapsedActionRow
        label="Punish Dissenters"
        cost=""
        actionId="punish-dissenters"
        images={[]}
        slotState={props.G.boardState.punishDissenters}
        onPlace={() => {
          clearMoves(props);
          setCount(1);
          setDialogOpen(true);
        }}
        disabled={!!rowRejection}
        disabledReason={rowRejection?.message}
        playerInfo={props.G.playerInfo}
        accent="#7f1d1d"
        bgImage={BTN_BG.punishDissenters}
      />

      <DialogShell
        open={dialogOpen}
        title="Punish Dissenters — Choose Payment"
        mood="peacetime"
        size="xs"
        cancelLabel="Cancel"
        onCancel={() => { setDialogOpen(false); }}
      >
        <Typography sx={{ mb: 1 }}>How many dissenters?</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: "center" }}>
          {[1, 2, 3, ...(maxPrisoners > 3 ? [4] : [])].map((n) => (
            <GameButton
              key={n}
              variant={count === n ? "primary" : "secondary"}
              onClick={() => setCount(n)}
              disabled={false}
            >
              {n}
            </GameButton>
          ))}
        </Stack>
        <Stack spacing={1.5}>
          {(
            [
              { paymentType: "gold" as const, variant: "secondary" as const, label: `Imprison ${count} (${PUNISH_GOLD_COST} Gold)` },
              { paymentType: "counsellor" as const, variant: "secondary" as const, label: `Imprison ${count} (1 Counsellor)` },
              { paymentType: "execute" as const, variant: "danger" as const, label: `Execute ${count} (-${PUNISH_EXECUTE_VP_COST * count} VP)` },
            ]
          ).map(({ paymentType, variant, label }) => {
            const rejection = rejectionFor(paymentType, count);
            return (
              <GameButton key={paymentType} variant={variant} fullWidth disabled={!!rejection} onClick={() => handlePay(paymentType)}>
                {label}{rejection ? ` — ${rejection.message.toLowerCase()}` : ""}
              </GameButton>
            );
          })}
        </Stack>
      </DialogShell>
    </>
  );
};

export default PunishDissentersRow;
