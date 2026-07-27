/**
 * Map markers — outpost, colony, fort.
 *
 * These were three coloured discs differing only in diameter (24 / 30 / 18px)
 * and the glyph inside, which put a claim, a settlement and a fortification
 * into the same visual form as each other AND as a route skyship. Four dots on
 * one tile, four different meanings.
 *
 * Each is now a distinct silhouette, so the SHAPE says what it is and colour
 * is left to say only whose it is — readable at any zoom and without reading
 * a glyph:
 *
 *   outpost — a staked claim: a post with a pennant on a small platform
 *   colony  — a settlement: a cluster of gabled roofs
 *   fort    — a battlement: a crenellated keep
 *
 * A dark casing under a light rim keeps them legible over ocean, land and
 * desert alike.
 */
import { ReactNode } from "react";
import { Box, Tooltip } from "@mui/material";

const OUTPOST_PATH =
  "M5.5,21.5 L18.5,21.5 L16.5,16.5 L7.5,16.5 Z " +
  "M11.1,17 L11.1,3 L12.9,3 L12.9,17 Z " +
  "M12.9,3.6 L20.5,6.6 L12.9,9.6 Z";

const COLONY_PATH =
  "M2.5,21.5 L2.5,12 L8,6.8 L13.5,12 L13.5,21.5 Z " +
  "M13,21.5 L13,14 L17.2,10.2 L21.5,14 L21.5,21.5 Z";

const FORT_PATH =
  "M3.5,21.5 L3.5,6 L7.2,6 L7.2,10 L10.2,10 L10.2,6 L13.8,6 " +
  "L13.8,10 L16.8,10 L16.8,6 L20.5,6 L20.5,21.5 Z";

const MarkerShape = ({ path, colour, size }: { path: string; colour: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
    {/* Casing first, then the body, then a top-light rim */}
    <path d={path} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth={4.5} strokeLinejoin="round" />
    <path d={path} fill={colour} stroke="rgba(255,255,255,0.92)" strokeWidth={1.4} strokeLinejoin="round" />
    <path d={path} fill="url(#markerSheen)" stroke="none" />
  </svg>
);

/** Shared gradient — declared once per marker tree, referenced by all shapes. */
const Sheen = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs>
      <linearGradient id="markerSheen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="55%" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
      </linearGradient>
    </defs>
  </svg>
);

const Marker = ({
  path,
  colour,
  size,
  tooltip,
  garrison = 0,
}: {
  path: string;
  colour: string;
  size: number;
  tooltip: ReactNode;
  garrison?: number;
}) => (
  <Tooltip title={tooltip} arrow>
    <Box sx={{ position: "relative", width: size, height: size, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.55))" }}>
      <Sheen />
      <MarkerShape path={path} colour={colour} size={size} />
      {garrison > 0 && (
        <Box
          sx={{
            position: "absolute",
            right: -4,
            bottom: -3,
            minWidth: 13,
            height: 13,
            px: "2px",
            borderRadius: "7px",
            backgroundColor: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.85)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {garrison}
        </Box>
      )}
    </Box>
  </Tooltip>
);

interface ClaimProps {
  colour: string;
  regiments: number;
  levies: number;
}

export const ColonyIcon = ({ colour, regiments, levies }: ClaimProps) => (
  <Marker
    path={COLONY_PATH}
    colour={colour}
    size={30}
    garrison={regiments + levies}
    tooltip={`Colony — garrison: ${regiments} regiments, ${levies} levies`}
  />
);

export const OutpostIcon = ({ colour, regiments, levies }: ClaimProps) => (
  <Marker
    path={OUTPOST_PATH}
    colour={colour}
    size={26}
    garrison={regiments + levies}
    tooltip={`Outpost — garrison: ${regiments} regiments, ${levies} levies`}
  />
);

export const FortIcon = ({ colour }: { colour: string }) => (
  <Marker path={FORT_PATH} colour={colour} size={20} tooltip="Fort — adds shields to each defending unit" />
);
