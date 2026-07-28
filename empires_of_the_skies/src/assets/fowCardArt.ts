// Generated Fortune of War card faces. Values come from the engine's
// FOW_CARD_CONFIG; faces are drawn at render time so any configured value
// displays correctly — there is no per-value art to keep in sync.

// Mirrors theme/tokens.base.ts parchment palette, kept static so card art
// stays constant across theme presets (cards are physical objects).
const PARCHMENT = "#F0E8D4";
const PARCHMENT_EDGE = "#E8DEC8";
const INK = "#3A2E22";
const SWORD_RED = "#A82E22";
const SHIELD_BLUE = "#1D5F8A";

const CARD_W = 216;
const CARD_H = 312;

// Stylised sword pointing up, ~26 units tall, centred on (0,0)
const SWORD_GLYPH = `
  <path d="M0 -14 L3 -8 L3 3 L-3 3 L-3 -8 Z" />
  <rect x="-7" y="3" width="14" height="3" rx="1" />
  <rect x="-1.6" y="6" width="3.2" height="5.5" rx="1" />
  <circle cx="0" cy="13" r="2.2" />`;

// Heater shield, ~25 units tall, centred on (0,0)
const SHIELD_GLYPH = `
  <path d="M-10 -10 Q0 -13.5 10 -10 Q11.5 2 0 12.5 Q-11.5 2 -10 -10 Z" />
  <path d="M-6.5 -7.5 Q0 -10 6.5 -7.5 Q7.5 0.5 0 8 Q-7.5 0.5 -6.5 -7.5 Z"
    fill="${PARCHMENT}" opacity="0.35" />`;

// Dice-style layouts (offsets from card centre) for 1–5 glyphs
const LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-32, -38], [32, 38]],
  3: [[-34, -44], [0, 0], [34, 44]],
  4: [[-32, -40], [32, -40], [-32, 40], [32, 40]],
  5: [[-34, -44], [34, -44], [0, 0], [-34, 44], [34, 44]],
};

const svgToDataUri = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const cardFace = (value: number, glyph: string, colour: string, label: string): string => {
  const positions = LAYOUTS[value];
  const centre = CARD_H / 2 - 10;
  const glyphs = positions
    ? positions
        .map(
          ([dx, dy]) =>
            `<g transform="translate(${CARD_W / 2 + dx} ${centre + dy}) scale(2.4)" fill="${colour}">${glyph}</g>`
        )
        .join("")
    : // Fallback for out-of-layout values: one large glyph with the numeral beside it
      `<g transform="translate(${CARD_W / 2 + 26} ${centre}) scale(3.4)" fill="${colour}">${glyph}</g>
       <text x="${CARD_W / 2 - 46}" y="${centre + 18}" font-size="52" font-weight="bold"
         font-family="Georgia, 'Times New Roman', serif" fill="${colour}">${value}</text>`;

  const corner = (rotate: boolean) =>
    `<g transform="${rotate ? `rotate(180 ${CARD_W / 2} ${CARD_H / 2})` : ""}">
      <text x="20" y="46" font-size="36" font-weight="bold"
        font-family="Georgia, 'Times New Roman', serif" fill="${colour}">${value}</text>
      <g transform="translate(29 62) scale(1.05)" fill="${colour}">${glyph}</g>
    </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
    <rect x="1.5" y="1.5" width="${CARD_W - 3}" height="${CARD_H - 3}" rx="16" fill="${PARCHMENT}" stroke="${INK}" stroke-width="2.5"/>
    <rect x="8" y="8" width="${CARD_W - 16}" height="${CARD_H - 16}" rx="11" fill="none" stroke="${INK}" stroke-width="1" opacity="0.45"/>
    <rect x="12" y="12" width="${CARD_W - 24}" height="${CARD_H - 24}" rx="9" fill="${PARCHMENT_EDGE}" opacity="0.5"/>
    ${corner(false)}
    ${corner(true)}
    ${glyphs}
    <text x="${CARD_W / 2}" y="${CARD_H - 24}" text-anchor="middle" font-size="15" letter-spacing="3"
      font-family="Georgia, 'Times New Roman', serif" fill="${INK}">${label.toUpperCase()}</text>
  </svg>`;
  return svgToDataUri(svg);
};

/** Card-face image (data URI) for a Fortune of War card of the given values. */
export const fowCardSrc = (sword: number, shield: number): string | null => {
  if (sword > 0) return cardFace(sword, SWORD_GLYPH, SWORD_RED, `${sword} sword${sword > 1 ? "s" : ""}`);
  if (shield > 0) return cardFace(shield, SHIELD_GLYPH, SHIELD_BLUE, `${shield} shield${shield > 1 ? "s" : ""}`);
  return null; // No Effect — has real card art
};
