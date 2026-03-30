import { baseTokens } from "./tokens.base";
import type { TokenPreset } from "./presets";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SWITCH PRESET HERE — uncomment the one you want:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// import { classicPreset as activePreset } from "./presets";
import { riverPreset as activePreset } from "./presets";
// import { riverBoldPreset as activePreset } from "./presets";

/**
 * Deep-merges a preset's overrides into the base token object.
 * Only overwrites the specific keys the preset defines —
 * everything else falls through from baseTokens.
 */
function applyPreset(base: typeof baseTokens, preset: TokenPreset) {
  return {
    ...base,

    ui: {
      ...base.ui,
      ...(preset.ui ?? {}),
    },

    mood: {
      peacetime: { ...base.mood.peacetime, ...(preset.mood?.peacetime ?? {}) },
      battle:    { ...base.mood.battle,    ...(preset.mood?.battle ?? {}) },
      election:  { ...base.mood.election,  ...(preset.mood?.election ?? {}) },
      discovery: { ...base.mood.discovery, ...(preset.mood?.discovery ?? {}) },
      crisis:    { ...base.mood.crisis,    ...(preset.mood?.crisis ?? {}) },
    },

    shadow: {
      ...base.shadow,
      ...(preset.shadow ?? {}),
    },
  } as const;
}

export type TokenAliases = {
  text: string;
  textMuted: string;
  textBright: string;
  gold: string;
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  border: string;
  borderMedium: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
};

const base = applyPreset(baseTokens, activePreset);

export const tokens = {
  ...base,
  ...Object.fromEntries(
    (["text", "textMuted", "textBright", "gold", "surface", "surfaceRaised", "surfaceHover", "border", "borderMedium", "danger", "success", "warning", "info"] as const).map(
      (key) => [key, base.ui[key as keyof typeof base.ui]]
    )
  ),
} as typeof base & TokenAliases;
