/**
 * MapOverlay — Floating status + action controls on the map.
 *
 * Replaces the old StatusBar. Two clusters:
 *   Top-left:    Round / Phase / Turn indicator chip
 *   Bottom-right: Action buttons (Clear, Pass, Confirm & End Turn)
 *
 * Positioned absolutely inside the map container.
 */
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps, GAME_PHASES } from "@eots/game";
import { tokens } from "@/theme";
import { getMood, getMoodTokens } from "@/theme";
import { GameButton } from "@/components/atoms/GameButton";
import { DialogShell } from "@/components/atoms/DialogShell";
import { clearMoves } from "@/utils/gameHelpers";
import { useActionHover } from "@/components/ActionBoard/ActionHoverContext";

const PULSING_MOODS = new Set(["battle", "crisis"]);

export const MapOverlay = (props: MyGameProps) => {
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const { setHoveredAction } = useActionHover();

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

  const showClear =
    isMyTurn && props.ctx.numMoves > 0 && props.ctx.phase === "actions";
  const showActions = showClear || showConfirmEndTurn || isMyTurn;

  return (
    <>
      {/* ── Top-left: Status chip ──────────────────────────────── */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* Round + Phase */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
            px: `${tokens.spacing.sm}px`,
            height: 28,
            borderRadius: `${tokens.radius.pill}px`,
            background: "rgba(30,24,16,0.82)",
            backdropFilter: "blur(8px)",
            border: `1px solid rgba(200,170,120,0.25)`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",

            // Mood-aware bottom accent
            borderBottomColor: `${moodTokens.accent}66`,

            ...(shouldPulse && {
              "@keyframes chipPulse": {
                "0%, 100%": { borderBottomColor: `${moodTokens.accent}66` },
                "50%": { borderBottomColor: moodTokens.accent },
              },
              animation: "chipPulse 2s ease-in-out infinite",
            }),
          }}
        >
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

        {/* Turn indicator */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
            px: `${tokens.spacing.sm}px`,
            height: 24,
            borderRadius: `${tokens.radius.pill}px`,
            background: "rgba(30,24,16,0.75)",
            backdropFilter: "blur(8px)",
            border: `1px solid rgba(200,170,120,0.18)`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            width: "fit-content",
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isMyTurn ? colour : currentPlayerInfo.colour,
              boxShadow: `0 0 6px ${isMyTurn ? colour : currentPlayerInfo.colour}88`,
              flexShrink: 0,
            }}
          />
          {isMyTurn ? (
            <Typography
              sx={{
                fontFamily: tokens.font.accent,
                fontSize: 11,
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
          ) : (
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: 11,
                color: "#C8B898",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              Waiting for{" "}
              <span style={{ color: currentPlayerInfo.colour, fontWeight: 600 }}>
                {currentPlayerName} ({currentPlayerInfo.kingdomName})
              </span>
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Bottom-right: Action buttons ───────────────────────── */}
      {showActions && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
          }}
        >
          {showClear && (
            <GameButton
              variant="ghost"
              size="sm"
              onMouseEnter={() => setHoveredAction("clear-moves")}
              onMouseLeave={() => setHoveredAction(null)}
              onClick={() => clearMoves(props)}
              sx={{
                color: "#C8B898",
                backgroundColor: "rgba(30,24,16,0.75)",
                backdropFilter: "blur(8px)",
                borderColor: "rgba(200,170,120,0.30)",
                "&:hover": {
                  color: "#F5ECD8",
                  borderColor: "#E8C860",
                  backgroundColor: "rgba(30,24,16,0.88)",
                },
              }}
            >
              Clear
            </GameButton>
          )}
          {showConfirmEndTurn ? (
            <GameButton
              variant="primary"
              size="sm"
              onMouseEnter={() => setHoveredAction("confirm-end-turn")}
              onMouseLeave={() => setHoveredAction(null)}
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
              onMouseEnter={() => setHoveredAction("pass-turn")}
              onMouseLeave={() => setHoveredAction(null)}
              onClick={() => setPassDialogOpen(true)}
              disabled={!isMyTurn}
              sx={{
                color: "#E8C860",
                backgroundColor: "rgba(30,24,16,0.75)",
                backdropFilter: "blur(8px)",
                borderColor: "rgba(200,170,120,0.30)",
                "&:hover": {
                  color: "#F5ECD8",
                  borderColor: "#E8C860",
                  backgroundColor: "rgba(30,24,16,0.88)",
                },
                "&.Mui-disabled": {
                  color: "rgba(200,170,120,0.3)",
                  borderColor: "rgba(200,170,120,0.15)",
                  backgroundColor: "rgba(30,24,16,0.5)",
                },
              }}
            >
              Pass
            </GameButton>
          )}
        </Box>
      )}

      {/* ── Pass confirmation dialog ──────────────────────────── */}
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
