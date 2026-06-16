import { useState } from "react";
import { ActionBoardProps } from "../shared";
import { BTN_BG } from "@/assets/actionBoard";
import { CollapsedActionRow } from "../CollapsedActionRow";
import {
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  PUNISH_EXECUTE_VP_COST,
} from "@eots/game";
import { Stack, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { clearMoves, getAvailableActions } from "@/utils/gameHelpers";

const PunishDissentersRow = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [count, setCount] = useState(1);

  const player = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const maxPrisoners =
    player?.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;
  const prisonCapacity = player ? maxPrisoners - player.prisoners : 0;
  const prisonFull = prisonCapacity <= 0;
  const hasActionAvailable = player ? getAvailableActions(player) > 0 : false;
  const canSpendCounsellor = player ? player.resources.counsellors >= 1 : false;
  const hasPrisoners = player ? player.prisoners > 0 : false;

  const handlePay = (paymentType: "gold" | "counsellor" | "execute") => {
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
          <GameButton variant="secondary" fullWidth disabled={!hasActionAvailable || prisonFull || count > prisonCapacity} onClick={() => handlePay("gold")}>
            Imprison {count} ({PUNISH_GOLD_COST} Gold){!hasActionAvailable ? " — no actions" : prisonFull ? " — prison full" : count > prisonCapacity ? ` — room for ${prisonCapacity}` : ""}
          </GameButton>
          <GameButton variant="secondary" fullWidth disabled={!hasActionAvailable || !canSpendCounsellor || prisonFull || count > prisonCapacity} onClick={() => handlePay("counsellor")}>
            Imprison {count} (1 Counsellor){!hasActionAvailable ? " — no actions" : !canSpendCounsellor ? " — no counsellors" : prisonFull ? " — prison full" : count > prisonCapacity ? ` — room for ${prisonCapacity}` : ""}
          </GameButton>
          <GameButton variant="danger" fullWidth disabled={!hasPrisoners || count > (player?.prisoners ?? 0)} onClick={() => handlePay("execute")}>
            Execute {count} (-{PUNISH_EXECUTE_VP_COST * count} VP){!hasPrisoners ? " — no prisoners" : count > (player?.prisoners ?? 0) ? ` — only ${player?.prisoners}` : ""}
          </GameButton>
        </Stack>
      </DialogShell>
    </>
  );
};

export default PunishDissentersRow;
