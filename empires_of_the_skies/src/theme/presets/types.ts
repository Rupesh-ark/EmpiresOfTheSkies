/**
 * TokenPreset — partial override shape for theme presets.
 * Only includes the token sections that presets are allowed to change.
 * Everything else inherits from baseTokens.
 */
export interface TokenPreset {
  name: string;
  description: string;

  ui?: {
    background?:    string;
    surface?:       string;
    surfaceRaised?: string;
    surfaceHover?:  string;
    border?:        string;
    borderMedium?:  string;
    borderFocus?:   string;
    gold?:          string;
    shipyardGold?:  string;
    teal?:          string;
    tealLight?:     string;
    tealMuted?:     string;
  };

  mood?: {
    peacetime?: { accent: string; bg: string; border: string };
    battle?:    { accent: string; bg: string; border: string };
    election?:  { accent: string; bg: string; border: string };
    discovery?: { accent: string; bg: string; border: string };
    crisis?:    { accent: string; bg: string; border: string };
  };

  shadow?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
}
