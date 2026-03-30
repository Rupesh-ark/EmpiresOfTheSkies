import React from "react";
import { Box, Typography } from "@mui/material";
import {
  GiCrossedSwords, GiShieldBounces, GiAnchor, GiCompass, GiTreasureMap,
  GiWatchtower, GiVillage,
} from "react-icons/gi";
import type { MyGameState, TileInfoProps, InfidelHostCounter } from "@eots/game";
import { TilePresence } from "./TilePresence";

interface TileDetailContentProps {
  tile: TileInfoProps;
  G: MyGameState;
  location: [number, number];
}

// Lore text by tile type / name
const LEGEND_LORE: Record<string, string> = {
  HereBeDragons: "Ancient wyrms circle these skies, guarding hoards of dragon scales. Only the bold claim their riches.",
  SeaElves: "The elusive Sea Elves trade in magic dust with those who earn their trust through peaceful passage.",
  TheFountainOfYouth: "Legends speak of waters that grant eternal vitality. Many have sought it; few have returned.",
  TheKingdomOfTheMerfolk: "Beneath the waves lies a civilization older than any kingdom of Faithdom. Their mithril is beyond compare.",
  TheKraken: "A terror of the deep. Its hide is prized by armorers, but harvesting it demands a fleet of rare courage.",
  TheLostCityOfGold: "Swallowed by the sea in ages past, its golden spires still gleam beneath the surface for those who dare to dive.",
};

const TILE_TYPE_LORE: Record<string, string> = {
  home: "The heartland of your kingdom. Your fleets launch from here and trade routes connect back to these waters.",
  ocean: "Open waters — fleets may pass through freely. No land to claim, but a vital corridor for trade and war.",
  infidel_empire: "A hostile realm beyond the borders of Faithdom. Too powerful to conquer, its hosts gather strength for invasion.",
};

const getLore = (tile: TileInfoProps): string => {
  if (tile.type === "legend") return LEGEND_LORE[tile.name] ?? "A place of myth and legend, waiting to be plundered.";
  return TILE_TYPE_LORE[tile.type] ?? "";
};

// Format loot as readable lines
const LOOT_NAMES: Record<string, string> = {
  gold: "Gold", mithril: "Mithril", dragonScales: "Dragon Scales",
  krakenSkin: "Kraken Skin", magicDust: "Magic Dust",
  stickyIchor: "Sticky Ichor", pipeweed: "Pipeweed", victoryPoints: "VP",
};

const formatLoot = (loot: Record<string, number>): string => {
  const items = Object.entries(loot)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${LOOT_NAMES[k] ?? k}: ${v}`);
  return items.length > 0 ? items.join(", ") : "None";
};

// Shared icon components
const Sword = ({ size = 14 }: { size?: number }) => (
  <GiCrossedSwords size={size} style={{ verticalAlign: "middle", marginRight: 2 }} />
);
const Shield = ({ size = 14 }: { size?: number }) => (
  <GiShieldBounces size={size} style={{ verticalAlign: "middle", marginRight: 2 }} />
);

// Infidel Empire content
const InfidelEmpireContent: React.FC<{ hosts: InfidelHostCounter[]; infidelFleet: MyGameState["infidelFleet"] }> = ({ hosts, infidelFleet }) => {
  const totalSwords = hosts.reduce((s, h) => s + h.swords, 0);
  const totalShields = hosts.reduce((s, h) => s + h.shields, 0);
  const threatLevel = totalSwords >= 30 ? "critical" : totalSwords >= 15 ? "high" : hosts.length > 0 ? "gathering" : "dormant";
  const threatColor = { critical: "#8B0000", high: "#B45309", gathering: "#6B4E1E", dormant: "rgba(0,0,0,0.4)" }[threatLevel];
  const threatLabel = { critical: "Invasion Imminent", high: "Growing Threat", gathering: "Forces Gathering", dormant: "Dormant" }[threatLevel];

  return (
    <>
      {/* Threat status banner */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.75, mb: 1.5,
        borderRadius: "6px",
        backgroundColor: `${threatColor}0C`,
        border: `1px solid ${threatColor}30`,
      }}>
        <Box sx={{
          width: 8, height: 8, borderRadius: "50%",
          backgroundColor: threatColor,
          boxShadow: threatLevel !== "dormant" ? `0 0 6px ${threatColor}60` : "none",
          "@keyframes threatPulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
          animation: threatLevel === "critical" ? "threatPulse 1.2s ease-in-out infinite" :
                    threatLevel === "high" ? "threatPulseSlow 2s ease-in-out infinite" : "none",
        }} />
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: threatColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {threatLabel}
        </Typography>
      </Box>

      {hosts.length > 0 ? (
        <>
          {/* Host counters */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", mb: 1.5 }}>
            {hosts.map((h, i) => (
              <Box key={i} sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                px: 1.5, py: 0.5,
                borderRadius: "4px",
                backgroundColor: "rgba(139,0,0,0.05)",
                border: "1px solid rgba(139,0,0,0.12)",
              }}>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>
                  {h.isFleet ? "Fleet Counter" : "Host Counter"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#8B0000", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Sword size={13} />{h.swords}
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#4A6741", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Shield size={13} />{h.shields}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Totals bar */}
          <Box sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            px: 1.5, py: 0.75,
            borderRadius: "6px",
            backgroundColor: "rgba(139,0,0,0.08)",
            border: "1px solid rgba(139,0,0,0.18)",
          }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#3A2E22" }}>
              Combined Strength
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#8B0000", display: "flex", alignItems: "center", gap: "3px" }}>
                <Sword size={15} />{totalSwords}
              </Typography>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#4A6741", display: "flex", alignItems: "center", gap: "3px" }}>
                <Shield size={15} />{totalShields}
              </Typography>
            </Box>
          </Box>
        </>
      ) : (
        <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.4)", fontStyle: "italic" }}>
          No hosts have gathered. The border holds… for now.
        </Typography>
      )}

      {/* Active fleet warning */}
      {infidelFleet?.active && (
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          mt: 1.5, px: 1.5, py: 0.75,
          borderRadius: "6px",
          backgroundColor: "rgba(139,0,0,0.12)",
          border: "1px solid rgba(139,0,0,0.3)",
        }}>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#8B0000" }}>
            Infidel Fleet Active
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#8B0000", display: "flex", alignItems: "center", gap: "3px" }}>
              <Sword size={14} />{infidelFleet.counter.swords}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#4A6741", display: "flex", alignItems: "center", gap: "3px" }}>
              <Shield size={14} />{infidelFleet.counter.shields}
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
};

// Home Waters content
const HomeContent: React.FC<{ lore: string; x: number; y: number; G: MyGameState }> = ({ lore, x, y, G }) => (
  <>
    {lore && (
      <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", fontStyle: "italic", mb: 1.5, lineHeight: 1.5 }}>
        {lore}
      </Typography>
    )}

    <Box sx={{
      display: "flex", alignItems: "center", gap: 1,
      px: 1.5, py: 0.75, mb: 1.5,
      borderRadius: "6px",
      backgroundColor: "rgba(29,95,138,0.08)",
      border: "1px solid rgba(29,95,138,0.2)",
    }}>
      <GiAnchor size={14} style={{ color: "#1D5F8A" }} />
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1D5F8A", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Home Waters
      </Typography>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(29,95,138,0.04)",
        border: "1px solid rgba(29,95,138,0.1)",
      }}>
        <GiAnchor size={12} style={{ color: "#1D5F8A", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.82rem", color: "#3A2E22" }}>
          Reserve fleets launch from here
        </Typography>
      </Box>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(29,95,138,0.04)",
        border: "1px solid rgba(29,95,138,0.1)",
      }}>
        <GiCompass size={12} style={{ color: "#1D5F8A", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.82rem", color: "#3A2E22" }}>
          Trade routes connect back to Faithdom
        </Typography>
      </Box>
    </Box>

    <Typography sx={{ mt: 1.5, fontSize: "0.78rem", color: "rgba(0,0,0,0.35)", fontStyle: "italic" }}>
      Cannot be conquered or claimed.
    </Typography>
    <TilePresence G={G} x={x} y={y} />
  </>
);

// Ocean content
const OceanContent: React.FC<{ lore: string; x: number; y: number; G: MyGameState }> = ({ lore, x, y, G }) => (
  <>
    {lore && (
      <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", fontStyle: "italic", mb: 1.5, lineHeight: 1.5 }}>
        {lore}
      </Typography>
    )}

    <Box sx={{
      display: "flex", alignItems: "center", gap: 1,
      px: 1.5, py: 0.75, mb: 1.5,
      borderRadius: "6px",
      backgroundColor: "rgba(29,95,138,0.08)",
      border: "1px solid rgba(29,95,138,0.2)",
    }}>
      <GiCompass size={14} style={{ color: "#1D5F8A" }} />
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1D5F8A", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Open Ocean
      </Typography>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(29,95,138,0.04)",
        border: "1px solid rgba(29,95,138,0.1)",
      }}>
        <GiAnchor size={12} style={{ color: "#1D5F8A", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.82rem", color: "#3A2E22" }}>
          Fleets may pass through freely
        </Typography>
      </Box>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1,
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(122,78,5,0.06)",
        border: "1px solid rgba(122,78,5,0.12)",
      }}>
        <Sword size={12} />
        <Typography sx={{ fontSize: "0.82rem", color: "#3A2E22" }}>
          Trade routes may be subject to piracy
        </Typography>
      </Box>
    </Box>

    <Typography sx={{ mt: 1.5, fontSize: "0.78rem", color: "rgba(0,0,0,0.35)", fontStyle: "italic" }}>
      No land to claim — but a vital corridor for trade and war.
    </Typography>
    <TilePresence G={G} x={x} y={y} />
  </>
);

// Legend content
const LegendContent: React.FC<{ lore: string; tile: TileInfoProps; x: number; y: number; G: MyGameState }> = ({ lore, tile, x, y, G }) => (
  <>
    {lore && (
      <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", fontStyle: "italic", mb: 1.5, lineHeight: 1.5 }}>
        {lore}
      </Typography>
    )}

    <Box sx={{
      display: "flex", alignItems: "center", gap: 1,
      px: 1.5, py: 0.75, mb: 1.5,
      borderRadius: "6px",
      backgroundColor: "rgba(184,134,11,0.08)",
      border: "1px solid rgba(184,134,11,0.25)",
    }}>
      <GiTreasureMap size={14} style={{ color: "#B8860B" }} />
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#B8860B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Legendary Site
      </Typography>
    </Box>

    {/* Plunder rewards */}
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(184,134,11,0.05)",
        border: "1px solid rgba(184,134,11,0.12)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <GiWatchtower size={13} style={{ color: "#6B4E1E" }} />
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Outpost</Typography>
        </Box>
        <Typography sx={{ fontSize: "0.82rem", color: "#6B4E1E", fontWeight: 600 }}>
          {formatLoot(tile.loot.outpost)}
        </Typography>
      </Box>
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 1.5, py: 0.5, borderRadius: "4px",
        backgroundColor: "rgba(184,134,11,0.05)",
        border: "1px solid rgba(184,134,11,0.12)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <GiVillage size={13} style={{ color: "#6B4E1E" }} />
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Colony</Typography>
        </Box>
        <Typography sx={{ fontSize: "0.82rem", color: "#6B4E1E", fontWeight: 600 }}>
          {formatLoot(tile.loot.colony)}
        </Typography>
      </Box>
    </Box>

    <Typography sx={{ mt: 1.5, fontSize: "0.78rem", color: "rgba(0,0,0,0.35)", fontStyle: "italic" }}>
      Fleet must be in sole occupation to plunder.
    </Typography>
    <TilePresence G={G} x={x} y={y} />
  </>
);

// Land content
const LandContent: React.FC<{ tile: TileInfoProps; x: number; y: number; G: MyGameState }> = ({ tile, x, y, G }) => {
  const bld = G.mapState.buildings[y]?.[x];
  const isColony = bld?.buildings === "colony";
  const garSwords = isColony
    ? (bld.garrisonedRegiments ?? 0) * 2 + (bld.garrisonedLevies ?? 0) + (bld.garrisonedEliteRegiments ?? 0) * 3
    : tile.sword;
  const garShields = isColony
    ? (bld.fort.length > 0 ? (bld.garrisonedRegiments ?? 0) + (bld.garrisonedLevies ?? 0) + (bld.garrisonedEliteRegiments ?? 0) : 0)
    : tile.shield;

  return (
    <>
      {/* Combat stats */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
        <Box sx={{
          flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75,
          px: 1.5, py: 0.75, borderRadius: "6px",
          backgroundColor: "rgba(139,0,0,0.06)",
          border: "1px solid rgba(139,0,0,0.15)",
        }}>
          <Sword size={15} />
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#8B0000" }}>{garSwords}</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{isColony ? "GAR" : "ATK"}</Typography>
        </Box>
        <Box sx={{
          flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75,
          px: 1.5, py: 0.75, borderRadius: "6px",
          backgroundColor: "rgba(74,103,65,0.06)",
          border: "1px solid rgba(74,103,65,0.15)",
        }}>
          <Shield size={15} />
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#4A6741" }}>{garShields}</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{isColony ? "GAR" : "DEF"}</Typography>
        </Box>
      </Box>

      {/* Loot */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 0.5, borderRadius: "4px",
          backgroundColor: "rgba(184,134,11,0.05)",
          border: "1px solid rgba(184,134,11,0.12)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GiWatchtower size={13} style={{ color: "#6B4E1E" }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Outpost</Typography>
          </Box>
          <Typography sx={{ fontSize: "0.82rem", color: "#6B4E1E", fontWeight: 600 }}>
            {formatLoot(tile.loot.outpost)}
          </Typography>
        </Box>
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 0.5, borderRadius: "4px",
          backgroundColor: "rgba(184,134,11,0.05)",
          border: "1px solid rgba(184,134,11,0.12)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GiVillage size={13} style={{ color: "#6B4E1E" }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Colony</Typography>
          </Box>
          <Typography sx={{ fontSize: "0.82rem", color: "#6B4E1E", fontWeight: 600 }}>
            {formatLoot(tile.loot.colony)}
          </Typography>
        </Box>
      </Box>
      <TilePresence G={G} x={x} y={y} />
    </>
  );
};

// Main TileDetailContent component
export const TileDetailContent: React.FC<TileDetailContentProps> = ({ tile, G, location }) => {
  const lore = getLore(tile);
  const [x, y] = location;

  switch (tile.type) {
    case "infidel_empire":
      return <InfidelEmpireContent hosts={G.accumulatedHosts} infidelFleet={G.infidelFleet} />;

    case "home":
      return <HomeContent lore={lore} x={x} y={y} G={G} />;

    case "ocean":
      return <OceanContent lore={lore} x={x} y={y} G={G} />;

    case "legend":
      return <LegendContent lore={lore} tile={tile} x={x} y={y} G={G} />;

    case "land":
    default:
      return <LandContent tile={tile} x={x} y={y} G={G} />;
  }
};

export default TileDetailContent;
