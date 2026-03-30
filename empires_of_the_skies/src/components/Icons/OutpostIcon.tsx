import { Tooltip } from "@mui/material";
import { tokens } from "@/theme";

/**
 * OutpostIcon — 50×50 map tile icon for outpost buildings.
 *
 * Pure SVG watchtower that colors dynamically with the owning kingdom's colour.
 * Structure: stone base → tower body → battlements → flag.
 * Garrison counts shown via tooltip.
 */
const OutpostIcon = (props: OutpostIconProps) => {
  const stroke = tokens.svg.stroke;
  const sw = tokens.svg.strokeWidth;

  return (
    <Tooltip
      title={`Regiments: ${props.regiments}
Levies: ${props.levies}`}
    >
      <svg
        width="50"
        height="50"
        viewBox="0 0 96 96"
        fill="none"
        style={{ width: "50px", height: "50px", border: "1px solid black" }}
      >
        {/* Background fill — kingdom colour tinted light */}
        <rect width="96" height="96" fill={`${props.colour}20`} />

        {/* Stone base platform */}
        <rect x="20" y="78" width="56" height="10" rx="2" fill={stroke} fillOpacity="0.15" stroke={stroke} strokeWidth={sw} />

        {/* Tower body */}
        <path
          d="M32 78 L32 30 L64 30 L64 78 Z"
          fill={props.colour}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        {/* Tower inner shadow (depth) */}
        <rect x="38" y="34" width="20" height="40" rx="1" fill="rgba(0,0,0,0.08)" />

        {/* Window slits */}
        <rect x="44" y="40" width="8" height="14" rx="4" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />
        <rect x="44" y="60" width="8" height="10" rx="1" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />

        {/* Battlements (crenellations) */}
        <rect x="28" y="24" width="10" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="43" y="24" width="10" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="58" y="24" width="10" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        {/* Battlement base bar */}
        <rect x="28" y="28" width="40" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Flag pole */}
        <line x1="48" y1="24" x2="48" y2="8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />

        {/* Flag — uses kingdom colour */}
        <path
          d="M48 8 L48 18 L62 13 Z"
          fill={props.colour}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        {/* Kingdom colour circle (bottom-right, same position as original) */}
        <circle cx="72" cy="72" r="14" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* "O" label in circle */}
        <text
          x="72"
          y="77"
          textAnchor="middle"
          fontFamily={tokens.font.accent}
          fontSize="16"
          fontWeight="700"
          fill="white"
          stroke="none"
        >
          O
        </text>
      </svg>
    </Tooltip>
  );
};

interface OutpostIconProps {
  colour: string;
  regiments: number;
  levies: number;
}

export default OutpostIcon;
