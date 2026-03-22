import { useState } from "react";
import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import {
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  PUNISH_EXECUTE_VP_COST,
  SLOTS_PUNISH_DISSENTERS,
} from "@eots/game";
import { Stack, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { clearMoves } from "@/utils/gameHelpers";

const PunishDissentersRow = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const player = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const maxPrisoners =
    player?.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;
  const prisonFull = player ? player.prisoners >= maxPrisoners : true;
  const canAffordCounsellor = player ? player.resources.counsellors >= 2 : false;
  const hasPrisoners = player ? player.prisoners > 0 : false;

  const handlePay = (paymentType: "gold" | "counsellor" | "execute") => {
    if (selectedSlot !== null) {
      props.moves.punishDissenters(selectedSlot, paymentType);
    }
    setDialogOpen(false);
    setSelectedSlot(null);
  };

  return (
    <>
      <CollapsedActionRow
        label="Punish Dissenters"
        cost=""
        actionId="punish-dissenters"
        images={[]}
        totalSlots={SLOTS_PUNISH_DISSENTERS}
        slotState={props.G.boardState.punishDissenters}
        onPlace={(slot) => {
          clearMoves(props);
          setSelectedSlot(slot);
          setDialogOpen(true);
        }}
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
        onCancel={() => { setDialogOpen(false); setSelectedSlot(null); }}
      >
        <Typography sx={{ mb: 1 }}>How will you pay for this action?</Typography>
        <Stack spacing={1.5}>
          <GameButton variant="secondary" fullWidth disabled={prisonFull} onClick={() => handlePay("gold")}>
            Imprison ({PUNISH_GOLD_COST} Gold){prisonFull ? " — prison full" : ""}
          </GameButton>
          <GameButton variant="secondary" fullWidth disabled={!canAffordCounsellor || prisonFull} onClick={() => handlePay("counsellor")}>
            Imprison (1 Counsellor){!canAffordCounsellor ? " — need 2" : prisonFull ? " — prison full" : ""}
          </GameButton>
          <GameButton variant="danger" fullWidth disabled={!hasPrisoners} onClick={() => handlePay("execute")}>
            Execute Prisoner (-{PUNISH_EXECUTE_VP_COST} Victory Points){!hasPrisoners ? " — no prisoners" : ""}
          </GameButton>
        </Stack>
      </DialogShell>
    </>
  );
};

export default PunishDissentersRow;
