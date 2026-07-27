/**
 * OpponentInspector — read a rival kingdom in depth, on demand.
 *
 * Inspection is investigative, so it lives in the drawer with Log and Stats
 * rather than welded to the always-on standings rail. Nothing here is
 * clickable: a surface that can be about someone else must never carry
 * controls that act on you.
 */
import { Box, Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";
import { IconRegiment, IconElite, IconLevy, IconSkyship } from "@/theme";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { Holdings } from "./Holdings";
import { MustersStatus, FleetStrip } from "./KingdomStations";

const SectionHeader = ({ label }: { label: string }) => (
  <Typography
    sx={{
      fontFamily: tokens.font.accent,
      fontSize: tokens.fontSize.xs,
      fontWeight: 700,
      color: tokens.ui.gold,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      lineHeight: 1,
      mb: "6px",
    }}
  >
    {label}
  </Typography>
);

interface OpponentInspectorProps extends MyGameProps {
  viewPlayerID: string;
}

export const OpponentInspector = (props: OpponentInspectorProps) => {
  const info = props.G.playerInfo[props.viewPlayerID];
  if (!info) return null;

  const isSelf = props.playerID === props.viewPlayerID;
  const name = props.matchData?.find((m) => String(m.id) === props.viewPlayerID)?.name;
  const heresyVP = info.hereticOrOrthodox === "heretic" ? info.heresyTracker : -info.heresyTracker;

  return (
    <Box sx={{ p: `${tokens.spacing.md}px`, display: "flex", flexDirection: "column", gap: `${tokens.spacing.md}px` }}>
      {/* Identity */}
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, minWidth: 0 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: info.colour, boxShadow: `0 0 6px ${info.colour}66`, flexShrink: 0 }} />
        <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.md, color: tokens.ui.text, lineHeight: 1.2, flex: 1 }}>
          {info.kingdomName}
          <Typography component="span" sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, ml: "6px" }}>
            {isSelf ? "you" : name ?? ""}
          </Typography>
        </Typography>
      </Box>

      {/* Standing */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "baseline" }}>
        <Typography sx={{ fontFamily: tokens.font.display, fontSize: 20, fontWeight: 800, color: tokens.ui.gold, lineHeight: 1 }}>
          {info.resources.victoryPoints}
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.gold, lineHeight: 1 }}>VP</Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: info.resources.gold < 0 ? tokens.ui.danger : tokens.ui.text, lineHeight: 1, ml: "6px" }}>
          {info.resources.gold} gold
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.sm,
            fontWeight: 700,
            lineHeight: 1,
            ml: "6px",
            color: info.hereticOrOrthodox === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox,
          }}
        >
          {info.hereticOrOrthodox === "heretic" ? "Heretic" : "Orthodox"} {heresyVP >= 0 ? "+" : ""}{heresyVP} VP
        </Typography>
      </Box>

      <Box>
        <SectionHeader label="Forces" />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          <ResourceChip icon={<IconRegiment style={{ fontSize: 15 }} />} value={info.resources.regiments} label="Regiments" size="sm" variant={info.resources.regiments === 0 ? "muted" : "default"} />
          <ResourceChip icon={<IconElite style={{ fontSize: 15 }} />} value={info.resources.eliteRegiments ?? 0} label="Elite" size="sm" variant={(info.resources.eliteRegiments ?? 0) === 0 ? "muted" : "default"} />
          <ResourceChip icon={<IconLevy style={{ fontSize: 15 }} />} value={info.resources.levies} label="Levies" size="sm" variant={info.resources.levies === 0 ? "muted" : "default"} />
          <ResourceChip icon={<IconSkyship style={{ fontSize: 15 }} />} value={info.resources.skyships} label="Skyships" size="sm" variant={info.resources.skyships === 0 ? "muted" : "default"} />
        </Box>
      </Box>

      <Box>
        <SectionHeader label="Holdings" />
        <Holdings {...props} variant="compact" bare viewPlayerID={props.viewPlayerID} />
      </Box>

      <Box>
        <SectionHeader label="Musters this round" />
        <MustersStatus colour={info.colour} shipyards={info.shipyards} counsellorLocations={info.playerBoardCounsellorLocations} />
      </Box>

      <Box>
        <SectionHeader label="Fleets" />
        <FleetStrip
          fleets={info.fleetInfo}
          tileMap={props.G.mapState.currentTileArray}
          deployableFleetIds={[]}
        />
      </Box>
    </Box>
  );
};
