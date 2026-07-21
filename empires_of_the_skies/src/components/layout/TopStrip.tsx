/**
 * TopStrip — the stable frame's top bar. Identity of the moment:
 * round / phase / whose turn, plus the shared heresy track in miniature.
 * Never moves, never resizes; only its text changes.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { MyGameProps, GAME_PHASES, PlayerInfo } from "@eots/game";
import { tokens, backgrounds } from "@/theme";
import { getMood, getMoodTokens } from "@/theme";

const PULSING_MOODS = new Set(["battle", "crisis"]);

const HERESY_MIN_POS = -9;
const HERESY_MAX_POS = 9;

/** Slim shared heresy track: player dots on an orthodox→heretic gradient. */
const MiniHeresyTrack = ({ playerInfo }: { playerInfo: Record<string, PlayerInfo> }) => {
  const players = Object.entries(playerInfo) as [string, PlayerInfo][];
  const span = HERESY_MAX_POS - HERESY_MIN_POS;

  // Players sharing a position fan out horizontally so nobody is hidden.
  const byPosition = new Map<number, [string, PlayerInfo][]>();
  for (const entry of players) {
    const pos = entry[1].heresyTracker;
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push(entry);
  }

  // Theme tooltips are parchment — use dark ink, not the bar's cream.
  const tooltip = (
    <Box sx={{ p: 0.5 }}>
      {players.map(([id, p]) => (
        <Typography key={id} sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, lineHeight: 1.5 }}>
          <span style={{ color: p.colour, fontWeight: 700 }}>●</span> {p.kingdomName}:{" "}
          {p.heresyTracker > 0 ? `+${p.heresyTracker}` : p.heresyTracker} (
          {p.hereticOrOrthodox === "heretic" ? "Heretic" : "Orthodox"})
        </Typography>
      ))}
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement="bottom" arrow>
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, cursor: "default" }}>
        <Typography sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.accent, fontWeight: 700, color: "#E8D9B0", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
          Orthodox
        </Typography>

        {/* Brass-framed gauge */}
        <Box
          sx={{
            p: "2px",
            borderRadius: "10px",
            background: backgrounds.brassBezel,
            boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: 236,
              height: 14,
              borderRadius: "8px",
              overflow: "hidden",
              // Recessed enamel channel: allegiance hues sunk into dark wood,
              // with fine position ticks etched across it.
              background: `
                repeating-linear-gradient(90deg,
                  transparent 0px,
                  transparent calc(100%/18 - 1px),
                  rgba(232,217,176,0.14) calc(100%/18 - 1px),
                  rgba(232,217,176,0.14) calc(100%/18)),
                linear-gradient(90deg, rgba(140,80,180,0.55) 0%, rgba(30,22,12,0.25) 50%, rgba(214,122,20,0.55) 100%),
                linear-gradient(180deg, #241a10 0%, #38291a 100%)
              `,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.65), inset 0 -1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Centre pillar */}
            <Box
              sx={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: "3px",
                transform: "translateX(-50%)",
                background: "linear-gradient(180deg, #c9a84e, #7a5f26)",
                boxShadow: "0 0 3px rgba(0,0,0,0.6)",
              }}
            />
            {/* Player markers — enamel pins */}
            {[...byPosition.entries()].map(([pos, group]) =>
              group.map(([id, p], i) => (
                <Box
                  key={id}
                  sx={{
                    position: "absolute",
                    left: `${((pos - HERESY_MIN_POS) / span) * 100}%`,
                    top: "50%",
                    transform: `translate(calc(-50% + ${(i - (group.length - 1) / 2) * 8}px), -50%)`,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.9) 0%, ${p.colour} 42%, rgba(0,0,0,0.35) 130%)`,
                    border: "1px solid rgba(0,0,0,0.55)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.18)",
                    zIndex: i + 1,
                    transition: "left 500ms ease, transform 500ms ease",
                  }}
                />
              ))
            )}
          </Box>
        </Box>

        <Typography sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.accent, fontWeight: 700, color: "#E8D9B0", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
          Heretic
        </Typography>
      </Box>
    </Tooltip>
  );
};

export const TopStrip = (props: MyGameProps) => {
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const currentPlayerInfo = props.G.playerInfo[props.ctx.currentPlayer];
  const mood = getMood(props.G.stage);
  const moodTokens = getMoodTokens(mood);
  const shouldPulse = PULSING_MOODS.has(mood);

  const phase = GAME_PHASES.find((p) => p.key === props.G.stage.phase);
  const phaseName = phase?.label ?? props.G.stage.sub;
  const currentPlayerName =
    props.matchData?.find((p) => String(p.id) === props.ctx.currentPlayer)?.name ?? "Player";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: `${tokens.spacing.md}px`,
        height: 40,
        flexShrink: 0,
        px: `${tokens.spacing.md}px`,
        background: backgrounds.leatherBar,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -6px 12px rgba(0,0,0,0.35)",
        borderBottom: `2px solid ${moodTokens.accent}55`,
        transition: `border-color ${tokens.transition.slow}`,
        ...(shouldPulse && {
          "@keyframes stripPulse": {
            "0%, 100%": { borderBottomColor: `${moodTokens.accent}55` },
            "50%": { borderBottomColor: moodTokens.accent },
          },
          animation: "stripPulse 2s ease-in-out infinite",
        }),
      }}
    >
      {/* Round + phase */}
      <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, color: "#E8C860", fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
        Round {props.G.round} / {props.G.finalRound}
      </Typography>
      <Box sx={{ width: "1px", height: 16, backgroundColor: "rgba(200,170,120,0.3)", flexShrink: 0 }} />
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "#F5ECD8", whiteSpace: "nowrap", lineHeight: 1 }}>
        {phaseName}
      </Typography>
      <Box sx={{ width: "1px", height: 16, backgroundColor: "rgba(200,170,120,0.3)", flexShrink: 0 }} />

      {/* Turn indicator */}
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, minWidth: 0 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: currentPlayerInfo?.colour ?? tokens.ui.gold,
            boxShadow: `0 0 6px ${currentPlayerInfo?.colour ?? tokens.ui.gold}88`,
            flexShrink: 0,
          }}
        />
        {isMyTurn ? (
          <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, fontWeight: 800, color: "#E8C860", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1, whiteSpace: "nowrap" }}>
            Your Turn
          </Typography>
        ) : (
          <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "#C8B898", lineHeight: 1 }}>
            Waiting for{" "}
            <span style={{ color: currentPlayerInfo?.colour, fontWeight: 600 }}>
              {currentPlayerName}
              {currentPlayerInfo ? ` (${currentPlayerInfo.kingdomName})` : ""}
            </span>
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1 }} />

      <MiniHeresyTrack playerInfo={props.G.playerInfo} />
    </Box>
  );
};
