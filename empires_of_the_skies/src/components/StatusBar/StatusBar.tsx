/**
 * StatusBar — Minimal top strip.
 *
 * Shows round/phase, turn indicator, and action buttons.
 * Resources have been moved to the PlayerBoard components.
 */
import { useState } from "react";
import { MyGameProps, GAME_PHASES } from "@eots/game";
import { Box, Typography } from "@mui/material";
import { clearMoves } from "@/utils/gameHelpers";
import { tokens } from "@/theme";
import { getMood, getMoodTokens } from "@/theme";
import { GameButton } from "@/components/atoms/GameButton";
import { DialogShell } from "@/components/atoms/DialogShell";

const PULSING_MOODS = new Set(["battle", "crisis"]);

// ── Recessed gauge styling ──────────────────────────────────────────────

const gaugeSx = {
  borderColor: "rgba(200,170,120,0.30)",
  background: "linear-gradient(180deg, #4A3C2C 0%, #3E3020 100%)",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06)",
  "& .MuiTypography-root": {
    fontWeight: 700,
    letterSpacing: "0.03em",
    color: "#F5ECD8",
  },
  "& svg": { color: "#E8C860 !important" },
};

// ── Decorative rivet ────────────────────────────────────────────────────

const BAR_GOLD = "#D4A840";

const Rivet = () => (
  <Box
    sx={{
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, #E8C860, ${BAR_GOLD}66 50%, ${BAR_GOLD}22)`,
      boxShadow: `inset 0 -1px 2px rgba(0,0,0,0.4), 0 0 3px ${BAR_GOLD}33`,
      flexShrink: 0,
    }}
  />
);

// ── Brass divider line ──────────────────────────────────────────────────

const BrassDivider = () => (
  <Box
    sx={{
      width: "1px",
      height: 22,
      background: `linear-gradient(180deg, transparent 0%, ${BAR_GOLD}55 30%, ${BAR_GOLD}55 70%, transparent 100%)`,
      flexShrink: 0,
    }}
  />
);

// ── Main component ──────────────────────────────────────────────────────

const StatusBar = (props: StatusBarProps) => {
  const [passDialogOpen, setPassDialogOpen] = useState(false);

  if (!props.playerID) return null;

  const playerInfo = props.G.playerInfo[props.playerID];
  const currentPlayerInfo = props.G.playerInfo[props.ctx.currentPlayer];
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const turnComplete = playerInfo.turnComplete;
  const showConfirmEndTurn =
    turnComplete && props.ctx.phase === "actions" && isMyTurn;

  const mood = getMood(props.G.stage);
  const moodTokens = getMoodTokens(mood);
  const shouldPulse = PULSING_MOODS.has(mood);

  const phase = GAME_PHASES.find((p) => p.key === props.ctx.phase);
  const phaseName = phase?.label ?? props.G.stage;
  const currentPlayerName =
    props.matchData?.find((p) => String(p.id) === props.ctx.currentPlayer)
      ?.name ?? "Player";

  const colour = playerInfo.colour;

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          height: "clamp(36px, 4vh, 44px)",
          px: `${tokens.spacing.md}px`,
          gap: `${tokens.spacing.sm}px`,

          // Layered panel — warm wood/parchment bar
          background: `
            linear-gradient(180deg,
              #5C4A38 0%,
              #4A3A2A 50%,
              #3E3020 100%
            )
          `,

          // Mood-aware bottom edge
          borderBottom: `2px solid ${moodTokens.accent}66`,

          // Top brass trim
          borderTop: `1px solid ${tokens.ui.gold}33`,

          // Subtle inner shadow for recessed feel
          boxShadow: `inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5)`,

          transition: `border-color ${tokens.transition.slow}`,

          // Pulsing for battle/crisis
          ...(shouldPulse && {
            "@keyframes barPulse": {
              "0%, 100%": {
                borderBottomColor: `${moodTokens.accent}66`,
                boxShadow: `inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5), 0 2px 12px ${moodTokens.accent}15`,
              },
              "50%": {
                borderBottomColor: moodTokens.accent,
                boxShadow: `inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5), 0 2px 20px ${moodTokens.accent}40`,
              },
            },
            animation: "barPulse 2s ease-in-out infinite",
          }),
        }}
      >
        {/* ── LEFT: Round + Phase + Turn ──────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: `${tokens.spacing.sm}px`,
            flexShrink: 0,
          }}
        >
          <Rivet />

          {/* Round + Phase chip */}
          <Box sx={{ ...gaugeSx, display: "inline-flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, height: 28, borderRadius: `${tokens.radius.pill}px` }}>
            <Typography
              sx={{
                fontFamily: tokens.font.accent,
                fontSize: tokens.fontSize.xs,
                color: "#E8C860",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              R{props.G.round}
            </Typography>
            <Box sx={{ width: "1px", height: 14, backgroundColor: "rgba(200,170,120,0.3)" }} />
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: "#F5ECD8",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {phaseName}
            </Typography>
          </Box>

          <BrassDivider />

          {/* Turn indicator chip */}
          {isMyTurn ? (
            <Box sx={{ ...gaugeSx, display: "inline-flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, height: 28, borderRadius: `${tokens.radius.pill}px` }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: colour,
                  boxShadow: `0 0 8px ${colour}88`,
                }}
              />
              <Typography
                sx={{
                  fontFamily: tokens.font.accent,
                  fontSize: tokens.fontSize.xs,
                  fontWeight: 800,
                  color: "#E8C860",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Your Turn
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: `${tokens.spacing.xs}px`,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: currentPlayerInfo.colour,
                  boxShadow: `0 0 6px ${currentPlayerInfo.colour}55`,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.xs,
                  color: "#C8B898",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                {currentPlayerName}
              </Typography>
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: "10px",
                  color: currentPlayerInfo.colour,
                  fontWeight: 600,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {currentPlayerInfo.kingdomName}
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── RIGHT: Action Buttons ──────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {isMyTurn &&
            props.ctx.numMoves > 0 &&
            props.ctx.phase === "actions" && (
              <GameButton
                variant="ghost"
                size="sm"
                onClick={() => clearMoves(props)}
                sx={{
                  color: "#C8B898",
                  borderColor: "rgba(200,170,120,0.30)",
                  "&:hover": { color: "#F5ECD8", borderColor: "#E8C860", background: "rgba(200,170,120,0.12)" },
                }}
              >
                Clear
              </GameButton>
            )}
          {showConfirmEndTurn ? (
            <GameButton
              variant="primary"
              size="sm"
              onClick={() => props.moves.confirmAction()}
              sx={{
                boxShadow: `0 0 10px ${tokens.ui.gold}44`,
                "@keyframes confirmGlow": {
                  "0%, 100%": { boxShadow: `0 0 10px ${tokens.ui.gold}44` },
                  "50%": { boxShadow: `0 0 20px ${tokens.ui.gold}66` },
                },
                animation: "confirmGlow 2s ease-in-out infinite",
              }}
            >
              Confirm & End Turn
            </GameButton>
          ) : (
            <GameButton
              variant="ghost"
              size="sm"
              onClick={() => setPassDialogOpen(true)}
              disabled={!isMyTurn}
              sx={{
                color: "#E8C860",
                borderColor: "rgba(200,170,120,0.30)",
                "&:hover": { color: "#F5ECD8", borderColor: "#E8C860", background: "rgba(200,170,120,0.12)" },
                "&.Mui-disabled": { color: "rgba(200,170,120,0.3)", borderColor: "rgba(200,170,120,0.15)" },
              }}
            >
              Pass
            </GameButton>
          )}

          <Rivet />
        </Box>
      </Box>

      {/* ── Pass confirmation dialog ────────────────────────────── */}
      <DialogShell
        open={passDialogOpen}
        title="Pass Turn?"
        mood="peacetime"
        size="xs"
        confirmLabel="Confirm Pass"
        confirmColor="error"
        onConfirm={() => {
          setPassDialogOpen(false);
          props.moves.pass();
        }}
        cancelLabel="Cancel"
        onCancel={() => setPassDialogOpen(false)}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            color: tokens.ui.text,
            fontSize: tokens.fontSize.sm,
          }}
        >
          You will not be able to make any further moves until the next phase.
        </Typography>
      </DialogShell>
    </>
  );
};

interface StatusBarProps extends MyGameProps {}
export default StatusBar;
