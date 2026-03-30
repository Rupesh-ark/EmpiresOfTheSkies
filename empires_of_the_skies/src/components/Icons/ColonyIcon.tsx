import { Tooltip } from "@mui/material";
import { tokens } from "@/theme";

/**
 * ColonyIcon — 50×50 map tile icon for colony buildings.
 *
 * Pure SVG walled settlement that colors dynamically with the owning kingdom's colour.
 * Structure: stone base → two towers with battlements → connecting wall → gate → flag.
 * Visually heavier than OutpostIcon to convey the upgraded settlement.
 * Garrison counts shown via tooltip.
 */
const ColonyIcon = (props: ColonyIconProps) => {
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
        <rect x="10" y="80" width="76" height="8" rx="2" fill={stroke} fillOpacity="0.15" stroke={stroke} strokeWidth={sw} />

        {/* Connecting wall between towers */}
        <rect x="22" y="50" width="52" height="30" fill={props.colour} fillOpacity="0.7" stroke={stroke} strokeWidth={sw} />

        {/* Wall inner texture */}
        <rect x="26" y="54" width="44" height="22" rx="1" fill="rgba(0,0,0,0.06)" />

        {/* Gate arch */}
        <path
          d="M40 80 L40 62 Q48 54 56 62 L56 80 Z"
          fill={`${props.colour}50`}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        {/* Gate inner */}
        <path
          d="M43 80 L43 64 Q48 58 53 64 L53 80 Z"
          fill="rgba(0,0,0,0.12)"
        />

        {/* Left tower body */}
        <rect x="12" y="32" width="20" height="48" fill={props.colour} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        {/* Left tower inner shadow */}
        <rect x="16" y="36" width="12" height="40" rx="1" fill="rgba(0,0,0,0.08)" />
        {/* Left window */}
        <rect x="18" y="44" width="8" height="12" rx="4" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />

        {/* Left battlements */}
        <rect x="10" y="26" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="20" y="26" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="10" y="30" width="24" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Right tower body */}
        <rect x="64" y="32" width="20" height="48" fill={props.colour} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        {/* Right tower inner shadow */}
        <rect x="68" y="36" width="12" height="40" rx="1" fill="rgba(0,0,0,0.08)" />
        {/* Right window */}
        <rect x="70" y="44" width="8" height="12" rx="4" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />

        {/* Right battlements */}
        <rect x="62" y="26" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="72" y="26" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="62" y="30" width="24" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Wall battlements (center) */}
        <rect x="32" y="44" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="44" y="44" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="56" y="44" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="32" y="48" width="32" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Flag pole (on left tower) */}
        <line x1="22" y1="26" x2="22" y2="10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />

        {/* Flag — uses kingdom colour */}
        <path
          d="M22 10 L22 20 L36 15 Z"
          fill={props.colour}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        {/* Kingdom colour circle (bottom-right) */}
        <circle cx="78" cy="14" r="12" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* "C" label in circle */}
        <text
          x="78"
          y="19"
          textAnchor="middle"
          fontFamily={tokens.font.accent}
          fontSize="15"
          fontWeight="700"
          fill="white"
          stroke="none"
        >
          C
        </text>
      </svg>
    </Tooltip>
  );
};

interface ColonyIconProps {
  colour: string;
  regiments: number;
  levies: number;
}

export default ColonyIcon;
