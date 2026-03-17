// ─────────────────────────────────────────────────────────────────────────────
// LEGACY RE-EXPORTS — theme now lives in theme/baseTheme.ts
// Existing imports of generalTheme and influencePrelatesTheme still work.
// New code should import from "@/theme" directly.
// ─────────────────────────────────────────────────────────────────────────────

import { baseTheme } from "../theme/baseTheme";

export const generalTheme = baseTheme;
export const influencePrelatesTheme = baseTheme;
