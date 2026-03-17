import { useMemo } from "react";
import { createTheme } from "@mui/material/styles";
import { baseTheme } from "./baseTheme";
import { getMood, getMoodTokens, GameMood } from "./phaseMoods";

/**
 * Returns a MUI theme merged from baseTheme + the current game-phase mood.
 * The mood palette is available on theme.palette.mood.main / .bg / .border.
 */
export function useGameTheme(stage: string) {
  const mood = getMood(stage);

  return useMemo(() => {
    const moodTokens = getMoodTokens(mood);

    return createTheme(baseTheme, {
      palette: {
        mood: {
          main:   moodTokens.accent,
          bg:     moodTokens.bg,
          border: moodTokens.border,
        },
      },
    });
  }, [mood]);
}

export type { GameMood };
export { getMood, getMoodTokens };
