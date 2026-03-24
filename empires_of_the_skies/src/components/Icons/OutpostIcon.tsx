import { Tooltip } from "@mui/material";
import { tokens } from "@/theme";

/**
 * OutpostIcon — 50×50 map tile icon for outpost buildings.
 *
 * Pure SVG watchtower with palisade wall, matching ColonyIcon design language.
 * Structure: stone base → tower body → palisade wall → battlements → flag.
 * Visually lighter than ColonyIcon to convey a smaller settlement.
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
        <rect x="10" y="80" width="76" height="8" rx="2" fill={stroke} fillOpacity="0.15" stroke={stroke} strokeWidth={sw} />

        {/* Palisade wall (right side, lower than tower) */}
        <rect x="50" y="52" width="30" height="28" fill={props.colour} fillOpacity="0.7" stroke={stroke} strokeWidth={sw} />
        {/* Palisade inner texture */}
        <rect x="54" y="56" width="22" height="20" rx="1" fill="rgba(0,0,0,0.06)" />

        {/* Palisade gate */}
        <path
          d="M60 80 L60 66 Q65 60 70 66 L70 80 Z"
          fill={`${props.colour}50`}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path
          d="M62 80 L62 68 Q65 63 68 68 L68 80 Z"
          fill="rgba(0,0,0,0.12)"
        />

        {/* Palisade battlements */}
        <rect x="50" y="46" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="62" y="46" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="74" y="46" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="50" y="50" width="32" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Tower body */}
        <rect x="14" y="30" width="28" height="50" fill={props.colour} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        {/* Tower inner shadow */}
        <rect x="18" y="34" width="20" height="42" rx="1" fill="rgba(0,0,0,0.08)" />

        {/* Tower windows */}
        <rect x="24" y="42" width="8" height="12" rx="4" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />
        <rect x="24" y="62" width="8" height="8" rx="1" fill={`${props.colour}40`} stroke={stroke} strokeWidth={sw} />

        {/* Tower battlements */}
        <rect x="12" y="24" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="22" y="24" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="32" y="24" width="8" height="8" fill={props.colour} stroke={stroke} strokeWidth={sw} />
        <rect x="12" y="28" width="30" height="4" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* Flag pole */}
        <line x1="28" y1="24" x2="28" y2="8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />

        {/* Flag — uses kingdom colour */}
        <path
          d="M28 8 L28 18 L42 13 Z"
          fill={props.colour}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        {/* Kingdom colour circle (top-right) */}
        <circle cx="78" cy="14" r="12" fill={props.colour} stroke={stroke} strokeWidth={sw} />

        {/* "O" label in circle */}
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
