import { useState } from "react";
import { ActionBoardButton } from "../ActionBoardButton";
import { ActionRow, RowHeader, ActionBoardProps } from "../shared";
import { PUNISH_DISSENTERS } from "@/assets/actionBoard";
import {
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  PUNISH_EXECUTE_VP_COST,
} from "@eots/game";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { fonts } from "@/designTokens";

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

  const handleSlotClick = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setDialogOpen(true);
  };

  const handlePay = (paymentType: "gold" | "counsellor" | "execute") => {
    if (selectedSlot !== null) {
      props.moves.punishDissenters(selectedSlot, paymentType);
    }
    setDialogOpen(false);
    setSelectedSlot(null);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setSelectedSlot(null);
  };

  return (
    <>
      <ActionRow
        header={
          <RowHeader
            label="Punish Dissenters"
            meta={[
              { label: "Cost", value: "2g or 1 counsellor" },
              { label: "Effect", value: "Imprison or execute" },
            ]}
            accent="#7f1d1d"
          />
        }
      >
        {PUNISH_DISSENTERS.map((image, i) => (
          <ActionBoardButton
            key={`punish-dissenter-${i}`}
            value={i}
            onClickFunction={handleSlotClick}
            backgroundImage={image}
            width="52px"
            counsellor={
              props.G.boardState.punishDissenters[
                (i + 1) as keyof typeof props.G.boardState.punishDissenters
              ]
            }
            requires={{ gold: true }}
            {...props}
          />
        ))}
      </ActionRow>

      <Dialog open={dialogOpen} onClose={handleCancel}>
        <DialogTitle sx={{ fontFamily: fonts.primary }}>
          Punish Dissenters — Choose Payment
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: fonts.system, mb: 1 }}>
            How will you pay for this action?
          </Typography>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              disabled={prisonFull}
              onClick={() => handlePay("gold")}
              sx={{ fontFamily: fonts.system, textTransform: "none" }}
            >
              Imprison ({PUNISH_GOLD_COST} Gold)
              {prisonFull && " — prison full"}
            </Button>
            <Button
              variant="contained"
              disabled={!canAffordCounsellor || prisonFull}
              onClick={() => handlePay("counsellor")}
              sx={{ fontFamily: fonts.system, textTransform: "none" }}
            >
              Imprison (1 Counsellor)
              {!canAffordCounsellor && " — need 2 counsellors"}
              {canAffordCounsellor && prisonFull && " — prison full"}
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={!hasPrisoners}
              onClick={() => handlePay("execute")}
              sx={{ fontFamily: fonts.system, textTransform: "none" }}
            >
              Execute Prisoner (-{PUNISH_EXECUTE_VP_COST} VP)
              {!hasPrisoners && " — no prisoners"}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleCancel}
            sx={{ fontFamily: fonts.system }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PunishDissentersRow;
