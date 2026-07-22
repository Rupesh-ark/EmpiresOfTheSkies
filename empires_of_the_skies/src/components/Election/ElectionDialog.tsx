import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GiChurch } from "react-icons/gi";

interface ElectionDialogProps extends MyGameProps {
  immediate?: boolean;
}

const ElectionDialog = (props: ElectionDialogProps) => {
  const [currentVote, setCurrentVote] = useState<string | null>(null);
  const { immediate = false } = props;

  const isVoting = immediate
    ? props.G.step === "immediate_election" &&
      props.playerID != null &&
      props.ctx.currentPlayer === props.playerID &&
      !props.G.hasVoted.includes(props.playerID)
    : props.G.step === "election" &&
      props.playerID != null &&
      props.ctx.currentPlayer === props.playerID &&
      !props.G.hasVoted.includes(props.playerID);

  const currentArchprelate = props.ctx.playOrder.find(
    (id) => props.G.playerInfo[id].isArchprelate
  );

  return (
    <DialogShell
      open={!!isVoting}
      title={immediate ? "Emergency Archprelate Election" : "Archprelate Election"}
      subtitle={
        immediate
          ? "The Archprelate has died. An emergency election is held immediately — no bribes."
          : "Cast your vote for the next Archprelate. The kingdom with the most cathedral votes wins."
      }
      mood="election"
      size="sm"
      confirmLabel="Confirm Vote"
      confirmDisabled={currentVote === null}
      onConfirm={() => {
        if (immediate) {
          props.moves.immediateElectionVote(currentVote);
        } else {
          props.moves.vote(currentVote);
        }
      }}
    >
      {currentArchprelate && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            mb: `${tokens.spacing.sm}px`,
          }}
        >
          Current Archprelate:{" "}
          <span style={{ fontWeight: 700, color: props.G.playerInfo[currentArchprelate].colour }}>
            {props.G.playerInfo[currentArchprelate].kingdomName}
          </span>
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {props.ctx.playOrder.map((id) => {
          const kingdom = props.G.playerInfo[id];
          const isSelected = currentVote === id;
          const cathedrals = kingdom.cathedrals + (props.G.nprCathedrals[id] ?? 0);

          return (
            <Box
              key={id}
              onClick={() => setCurrentVote(id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: `${tokens.spacing.sm}px`,
                px: `${tokens.spacing.sm + 2}px`,
                py: `${tokens.spacing.sm + 2}px`,
                borderRadius: `${tokens.radius.md}px`,
                border: isSelected
                  ? `2px solid ${kingdom.colour}`
                  : `1px solid ${tokens.ui.border}`,
                backgroundColor: isSelected
                  ? `${kingdom.colour}18`
                  : tokens.ui.surface,
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                "&:hover": {
                  borderColor: kingdom.colour,
                  backgroundColor: `${kingdom.colour}0D`,
                  transform: "scale(1.02)",
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: isSelected ? `${kingdom.colour}30` : `${tokens.ui.textMuted}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: `all ${tokens.transition.fast}`,
                }}
              >
                <GiChurch
                  size={18}
                  style={{ color: isSelected ? kingdom.colour : tokens.ui.textMuted }}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: tokens.font.accent,
                    fontSize: tokens.fontSize.sm,
                    fontWeight: 700,
                    color: isSelected ? kingdom.colour : tokens.ui.text,
                    lineHeight: 1.2,
                  }}
                >
                  {kingdom.kingdomName}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                    lineHeight: 1.35,
                    mt: "2px",
                  }}
                >
                  {cathedrals} cathedral{cathedrals !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </DialogShell>
  );
};

export default ElectionDialog;
