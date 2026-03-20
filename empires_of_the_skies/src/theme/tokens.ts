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

export const tokens = applyPreset(baseTokens, activePreset);
