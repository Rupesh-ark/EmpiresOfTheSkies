/**
 * PlayerBoard — phase-aware router.
 *
 * Renders Full mode (actions phase) or Compact mode (all other visible phases).
 * The parent layout (GameLayout) decides WHERE this appears;
 * this component decides WHAT to render based on the phase.
 *
 * Applies mood-aware border/glow at the container level.
 */
import { Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { PlayerBoardFull } from "./PlayerBoardFull";
import { PlayerBoardCompact } from "./PlayerBoardCompact";
import { getMood, getMoodTokens } from "@/theme";
import { tokens } from "@/theme";

// Phases where the player board is completely hidden
const HIDDEN_PHASES = new Set([
  "kingdom_advantage",
  "legacy_card",
  "taxes",
  "reset",
]);

// Phases where FoW cards should be shown expanded (battle decisions)
const FOW_EXPANDED_PHASES = new Set([
  "aerial_battle",
  "ground_battle",
  "plunder_legends",
  "conquest",
  "resolution",
]);

// Phases with pulsing border animation (battle + crisis moods)
const PULSING_MOODS = new Set(["battle", "crisis"]);

export interface PlayerBoardProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
}

export const PlayerBoard = (props: PlayerBoardProps) => {
  const phase = props.ctx.phase ?? "";

  if (HIDDEN_PHASES.has(phase)) return null;

  const mood = getMood(props.G.stage);
  const moodTokens = getMoodTokens(mood);
  const shouldPulse = PULSING_MOODS.has(mood);

  const content =
    phase === "actions" ? (
      <PlayerBoardFull {...props} />
    ) : (
      <PlayerBoardCompact
        {...props}
        showFoWCards={FOW_EXPANDED_PHASES.has(phase)}
        showHeresy={phase === "election"}
      />
    );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // Mood-aware left accent border
        borderLeft: `3px solid ${moodTokens.border}`,
        // Mood-aware subtle background tint
        backgroundColor: moodTokens.bg,
        // Pulsing glow for battle and crisis moods
        ...(shouldPulse && {
          "@keyframes moodPulse": {
            "0%, 100%": { boxShadow: `inset 0 0 8px ${moodTokens.accent}15` },
            "50%": { boxShadow: `inset 0 0 16px ${moodTokens.accent}30` },
          },
          animation: "moodPulse 3s ease-in-out infinite",
        }),
        // Smooth mood transitions
        transition: `border-color ${tokens.transition.slow}, background-color ${tokens.transition.slow}`,
      }}
    >
      {content}
    </Box>
  );
};
