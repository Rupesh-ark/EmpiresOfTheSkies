import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { keyframes } from "@emotion/react";

import ReactCardFlip from "react-card-flip";
import { useLongPress } from "use-long-press";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MyGameProps } from "@eots/game";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import type { FleetDragState } from "./fleetDragTypes";
import { Close } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import { baseTheme, backgrounds } from "@/theme";
import FortIcon from "../Icons/FortIcon";
import FleetIcon from "../Icons/FleetIcon";
import ColonyIcon from "../Icons/ColonyIcon";
import OutpostIcon from "../Icons/OutpostIcon";
import svgNameToElementMap from "./nameToElementMap";
import { getLocationPresentation } from "@/utils/locationLabels";
import { TileInfoProps, MyGameState, InfidelHostCounter } from "@eots/game";
import FleetTransferDialog from "./FleetTransferDialog";
import {
  GiCrossedSwords, GiShieldBounces, GiAnchor, GiCompass, GiTreasureMap,
  GiWatchtower, GiVillage, GiZeppelin, GiChessKnight, GiShield, GiHelmet, GiMilitaryFort,
} from "react-icons/gi";

const Sword = ({ size = 14 }: { size?: number }) => (
  <GiCrossedSwords size={size} style={{ verticalAlign: "middle", marginRight: 2 }} />
);
const Shield = ({ size = 14 }: { size?: number }) => (
  <GiShieldBounces size={size} style={{ verticalAlign: "middle", marginRight: 2 }} />
);

// ── Lore text by tile type / name ────────────────────────────────────────

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

// ── Format loot as readable lines ────────────────────────────────────────

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

// ── Tile detail content by type ──────────────────────────────────────────

/** Renders the on-tile presence: building, garrison, fort, and fleets at this location. */
const TilePresence = ({ G, x, y }: { G: MyGameState; x: number; y: number }) => {
  const building = G.mapState.buildings[y]?.[x];
  const fleetsHere = Object.values(G.playerInfo).flatMap((p) =>
    p.fleetInfo
      .filter((f) => f.location[0] === x && f.location[1] === y && f.skyships > 0)
      .map((f) => ({ ...f, colour: p.colour, kingdom: p.kingdomName }))
  );
  const infidelFleetHere = G.infidelFleet?.active && !G.infidelFleet.destroyed &&
    G.infidelFleet.location[0] === x && G.infidelFleet.location[1] === y;
  const hasBuildingOrFleets = building?.buildings || building?.fort || fleetsHere.length > 0 || infidelFleetHere;
  if (!hasBuildingOrFleets) return null;

  return (
    <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid rgba(120,90,50,0.15)" }}>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
        Present on tile
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Building (outpost/colony) */}
        {building?.buildings && building.player && (
          <Box sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            px: 1.5, py: 0.5, borderRadius: "4px",
            backgroundColor: `${building.player.colour}12`,
            border: `1px solid ${building.player.colour}30`,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {building.buildings === "outpost"
                ? <GiWatchtower size={13} style={{ color: building.player.colour }} />
                : <GiVillage size={13} style={{ color: building.player.colour }} />
              }
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>
                {building.buildings === "outpost" ? "Outpost" : "Colony"}
              </Typography>
              <Box sx={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: building.player.colour, flexShrink: 0,
              }} />
              <Typography sx={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.5)" }}>
                {building.player.kingdomName}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Garrison */}
        {building && (building.garrisonedRegiments > 0 || building.garrisonedLevies > 0 || building.garrisonedEliteRegiments > 0) && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 1.5, py: 0.5, borderRadius: "4px",
            backgroundColor: "rgba(120,90,50,0.05)",
            border: "1px solid rgba(120,90,50,0.12)",
          }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(0,0,0,0.5)" }}>Garrison</Typography>
            {building.garrisonedRegiments > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <GiChessKnight size={12} style={{ color: "#6B4E1E" }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#3A2E22" }}>{building.garrisonedRegiments}</Typography>
              </Box>
            )}
            {building.garrisonedEliteRegiments > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <GiHelmet size={12} style={{ color: "#6B4E1E" }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#3A2E22" }}>{building.garrisonedEliteRegiments}</Typography>
              </Box>
            )}
            {building.garrisonedLevies > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <GiShield size={12} style={{ color: "#6B4E1E" }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#3A2E22" }}>{building.garrisonedLevies}</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Fort */}
        {building?.fort && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            px: 1.5, py: 0.5, borderRadius: "4px",
            backgroundColor: "rgba(120,90,50,0.05)",
            border: "1px solid rgba(120,90,50,0.12)",
          }}>
            <GiMilitaryFort size={13} style={{ color: "#6B4E1E" }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Fort</Typography>
            {building.player && (
              <>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: building.player.colour, flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.5)" }}>{building.player.kingdomName}</Typography>
              </>
            )}
          </Box>
        )}

        {/* Fleets */}
        {fleetsHere.map((fleet, i) => (
          <Box key={i} sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            px: 1.5, py: 0.5, borderRadius: "4px",
            backgroundColor: `${fleet.colour}10`,
            border: `1px solid ${fleet.colour}25`,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <GiZeppelin size={13} style={{ color: fleet.colour }} />
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A2E22" }}>Fleet {fleet.fleetId}</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: fleet.colour, flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.5)" }}>{fleet.kingdom}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <GiZeppelin size={11} style={{ color: "rgba(0,0,0,0.4)" }} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#3A2E22" }}>{fleet.skyships}</Typography>
              </Box>
              {fleet.regiments > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <GiChessKnight size={11} style={{ color: "rgba(0,0,0,0.4)" }} />
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#3A2E22" }}>{fleet.regiments}</Typography>
                </Box>
              )}
              {fleet.eliteRegiments > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <GiHelmet size={11} style={{ color: "rgba(0,0,0,0.4)" }} />
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#3A2E22" }}>{fleet.eliteRegiments}</Typography>
                </Box>
              )}
              {fleet.levies > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <GiShield size={11} style={{ color: "rgba(0,0,0,0.4)" }} />
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#3A2E22" }}>{fleet.levies}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        ))}

        {/* Infidel Fleet on this tile */}
        {infidelFleetHere && G.infidelFleet && (
          <>
            <Box sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              px: 1.5, py: 0.5, borderRadius: "4px",
              backgroundColor: "rgba(139,0,0,0.08)",
              border: "1px solid rgba(139,0,0,0.2)",
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <GiCrossedSwords size={13} style={{ color: "#8B0000" }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#8B0000" }}>Infidel Fleet</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#8B0000", display: "flex", alignItems: "center", gap: "3px" }}>
                  <GiCrossedSwords size={11} />{G.infidelFleet.counter.swords}
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#4A6741", display: "flex", alignItems: "center", gap: "3px" }}>
                  <GiShieldBounces size={11} />{G.infidelFleet.counter.shields}
                </Typography>
              </Box>
            </Box>
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: "4px",
              backgroundColor: "rgba(139,0,0,0.04)",
              border: "1px solid rgba(139,0,0,0.1)",
            }}>
              <Typography sx={{ fontSize: "0.78rem", color: "#8B0000", fontWeight: 600 }}>
                Subject to Piracy
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.45)", lineHeight: 1.3 }}>
                Trade routes through this tile pay gold to the bank
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

const TileDetailContent = ({
  tile, G, location,
}: {
  tile: TileInfoProps;
  G: MyGameState;
  location: [number, number];
}) => {
  const lore = getLore(tile);
  const [x, y] = location;

  switch (tile.type) {
    case "infidel_empire": {
      const hosts: InfidelHostCounter[] = G.accumulatedHosts;
      const totalSwords = hosts.reduce((s, h) => s + h.swords, 0);
      const totalShields = hosts.reduce((s, h) => s + h.shields, 0);
      const threatLevel = totalSwords >= 30 ? "critical" : totalSwords >= 15 ? "high" : hosts.length > 0 ? "gathering" : "dormant";
      const threatColor = { critical: "#8B0000", high: "#B45309", gathering: "#6B4E1E", dormant: "rgba(0,0,0,0.4)" }[threatLevel];
      const threatLabel = { critical: "Invasion Imminent", high: "Growing Threat", gathering: "Forces Gathering", dormant: "Dormant" }[threatLevel];

      return (
        <>
          {lore && (
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", fontStyle: "italic", mb: 1.5, lineHeight: 1.5 }}>
              {lore}
            </Typography>
          )}

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
              ...(threatLevel === "critical" && {
                "@keyframes threatPulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
                animation: "threatPulse 1.2s ease-in-out infinite",
              }),
              ...(threatLevel === "high" && {
                "@keyframes threatPulseSlow": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.5, transform: "scale(1.3)" } },
                animation: "threatPulseSlow 2s ease-in-out infinite",
              }),
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
          {G.infidelFleet?.active && (
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
                  <Sword size={14} />{G.infidelFleet.counter.swords}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#4A6741", display: "flex", alignItems: "center", gap: "3px" }}>
                  <Shield size={14} />{G.infidelFleet.counter.shields}
                </Typography>
              </Box>
            </Box>
          )}

        </>
      );
    }

    case "home":
      return (
        <>
          {lore && (
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", fontStyle: "italic", mb: 1.5, lineHeight: 1.5 }}>
              {lore}
            </Typography>
          )}

          {/* Status banner */}
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

    case "ocean":
      return (
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

    case "legend":
      return (
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

    case "land":
    default: {
      const bld = G.mapState.buildings[y]?.[x];
      const isColony = bld?.buildings === "colony";
      const garSwords = isColony
        ? (bld.garrisonedRegiments ?? 0) * 2 + (bld.garrisonedLevies ?? 0) + (bld.garrisonedEliteRegiments ?? 0) * 3
        : tile.sword;
      const garShields = isColony
        ? (bld.fort ? (bld.garrisonedRegiments ?? 0) + (bld.garrisonedLevies ?? 0) + (bld.garrisonedEliteRegiments ?? 0) : 0)
        : tile.shield;

      return (
        <>
          {/* Combat stats — garrison strength for colonies, native values otherwise */}
          <Box sx={{
            display: "flex", gap: 1.5, mb: 1.5,
          }}>
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
    }
  }
};

// ── Draggable fleet icon wrapper ─────────────────────────────────────────

const DraggableFleetIcon = ({
  draggableId,
  colour,
  skyships,
  regiments,
  levies,
  compact,
}: {
  draggableId: string;
  colour: string;
  skyships: number;
  regiments: number;
  levies: number;
  compact?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
    >
      <FleetIcon
        colour={colour}
        skyships={skyships}
        regiments={regiments}
        levies={levies}
        compact={compact}
      />
    </div>
  );
};

//Method for displaying a flippable tile which contains a world map tile image
export const WorldMapTile = memo((props: worldMapTileProps) => {
  const xPosition = useRef(0);
  const yPosition = useRef(0);
  const longPressCallback = useCallback(() => {}, []);
  const [xLocation, yLocation] = props.location;
  const fort = props.G.mapState.buildings[yLocation][xLocation].fort;

  const fortColour =
    props.G.mapState.buildings[yLocation][xLocation].player?.colour;

  const building = () => {
    const currentRegion = props.G.mapState.buildings[yLocation][xLocation];
    const currentBuilding = currentRegion.buildings;
    let icon;
    if (currentBuilding === "colony") {
      icon = (
        <ColonyIcon
          colour={
            fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour
          }
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    } else if (currentBuilding === "outpost") {
      icon = (
        <OutpostIcon
          colour={
            fortColour ?? props.G.playerInfo[props.ctx.currentPlayer].colour
          }
          regiments={currentRegion.garrisonedRegiments}
          levies={currentRegion.garrisonedLevies}
        />
      );
    }

    return icon;
  };

  const myPlayerID = props.playerID ?? props.ctx.currentPlayer;
  const myPlayerInfo = props.G.playerInfo[myPlayerID];

  const isActionsPhase = props.ctx.phase === "actions";
  const isMyTurn = props.ctx.currentPlayer === myPlayerID;

  // Individual fleet positioning — each fleet gets its own spot
  const isHomeWaters = xLocation === 4 && yLocation === 0;

  // Kingdom positions on the Home Waters tile [4,0]
  const KINGDOM_POSITIONS: Record<string, { top: string; left: string }[]> = {
    Angland:     [{ top: "8%",  left: "14%" }, { top: "8%",  left: "28%" }, { top: "22%", left: "14%" }],
    Gallois:     [{ top: "36%", left: "14%" }, { top: "36%", left: "28%" }, { top: "50%", left: "14%" }],
    Castillia:   [{ top: "64%", left: "10%" }, { top: "64%", left: "24%" }, { top: "78%", left: "10%" }],
    Nordmark:    [{ top: "8%",  left: "68%" }, { top: "8%",  left: "82%" }, { top: "22%", left: "68%" }],
    Ostreich:    [{ top: "36%", left: "72%" }, { top: "36%", left: "86%" }, { top: "50%", left: "72%" }],
    Constantium: [{ top: "64%", left: "68%" }, { top: "64%", left: "82%" }, { top: "78%", left: "68%" }],
  };

  // Generic positions for non-kingdom tiles (up to 18 slots: 6 players × 3 fleets)
  // Centered layout — fills from the middle outward so small groups stay central
  const TILE_SLOTS = [
    { top: "35%", left: "35%" }, { top: "35%", left: "55%" }, { top: "55%", left: "35%" },
    { top: "55%", left: "55%" }, { top: "25%", left: "45%" }, { top: "65%", left: "45%" },
    { top: "45%", left: "20%" }, { top: "45%", left: "70%" }, { top: "15%", left: "30%" },
    { top: "15%", left: "60%" }, { top: "75%", left: "30%" }, { top: "75%", left: "60%" },
    { top: "25%", left: "15%" }, { top: "25%", left: "75%" }, { top: "65%", left: "15%" },
    { top: "65%", left: "75%" }, { top: "45%", left: "45%" }, { top: "10%", left: "45%" },
  ];

  interface PositionedFleet {
    key: string;
    position: { top: string; left: string };
    element: JSX.Element;
  }

  const positionedFleets: PositionedFleet[] = [];
  let slotIdx = 0;

  Object.entries(props.G.playerInfo).forEach(([playerId, playerInfo]) => {
    const playerFleetsHere = playerInfo.fleetInfo.filter(
      (f) => f.location[0] === xLocation && f.location[1] === yLocation && f.skyships > 0
    );
    if (playerFleetsHere.length === 0) return;

    const isMyFleet = playerId === myPlayerID;
    const kingdomName = playerInfo.kingdomName;
    const kingdomSlots = isHomeWaters && kingdomName ? KINGDOM_POSITIONS[kingdomName] : null;

    playerFleetsHere.forEach((fleet, fleetIdx) => {
      const draggableId = `map-fleet-${playerId}-${fleet.fleetId}`;

      const position = kingdomSlots
        ? kingdomSlots[fleetIdx % kingdomSlots.length]
        : TILE_SLOTS[slotIdx % TILE_SLOTS.length];
      if (!kingdomSlots) slotIdx++;

      const canDrag =
        isActionsPhase &&
        isMyTurn &&
        isMyFleet &&
        fleet.skyships > 0 &&
        !myPlayerInfo?.playerBoardCounsellorLocations.dispatchSkyshipFleet &&
        !myPlayerInfo?.playerBoardCounsellorLocations.dispatchDisabled;

      let element: JSX.Element;
      if (isMyFleet && !canDrag) {
        const getReason = (): string => {
          if (!isActionsPhase) return "Can only deploy during the Actions phase";
          if (!isMyTurn) return "It's not your turn";
          if (myPlayerInfo?.playerBoardCounsellorLocations.dispatchSkyshipFleet) return "Already dispatched this round";
          if (myPlayerInfo?.playerBoardCounsellorLocations.dispatchDisabled) return "Dispatch unavailable";
          if (fleet.skyships === 0) return "Fleet has no skyships";
          return "Cannot deploy right now";
        };
        element = (
          <Box
            onClick={(e) => { e.stopPropagation(); props.onFleetDragAttempt?.(getReason()); }}
            sx={{ cursor: "not-allowed" }}
          >
            <FleetIcon colour={playerInfo.colour} skyships={fleet.skyships} regiments={fleet.regiments} levies={fleet.levies} compact={isHomeWaters} />
          </Box>
        );
      } else if (canDrag) {
        element = (
          <DraggableFleetIcon
            draggableId={draggableId}
            colour={playerInfo.colour}
            skyships={fleet.skyships}
            regiments={fleet.regiments}
            levies={fleet.levies}
            compact={isHomeWaters}
          />
        );
      } else {
        element = (
          <FleetIcon colour={playerInfo.colour} skyships={fleet.skyships} regiments={fleet.regiments} levies={fleet.levies} compact={isHomeWaters} />
        );
      }

      positionedFleets.push({ key: draggableId, position, element });
    });
  });

  const currentTile = props.G.mapState.currentTileArray[yLocation][xLocation];
  const lootNameMap: Record<string, string> = {
    gold: "Gold",
    mithril: "Mithril",
    dragonScales: "Dragon Scales",
    krakenSkin: "Kraken Skin",
    magicDust: "Magic Dust",
    stickyIchor: "Sticky Ichor",
    pipeweed: "Pipeweed",
    victoryPoints: "Victory Points",
  };
  const outpostLoot = () => {
    let text = "";
    Object.entries(currentTile.loot.outpost).forEach(([key, value]) => {
      if (value > 0) {
        text += `\t\t${lootNameMap[key]}: ${value}\n`;
      }
    });
    return text;
  };

  const colonyLoot = () => {
    let text = "";
    Object.entries(currentTile.loot.colony).forEach(([key, value]) => {
      if (value > 0) {
        text += `\t\t${lootNameMap[key]}: ${value}\n`;
      }
    });
    return text;
  };
  let tooltipText = `Attack: ${currentTile.sword}\n
Defence: ${currentTile.shield}\n
Loot:
\t Outpost:\n ${outpostLoot()}
\t Colony:\n ${colonyLoot()}`;

  const longPressEvent = useLongPress(longPressCallback, {
    cancelOnMovement: true,
    cancelOutsideElement: true,
    threshold: 150,
    onStart: useCallback((event: any) => {
      xPosition.current = event.clientX;
      yPosition.current = event.clientY;
    }, []),
  });

  const bind = longPressEvent("test context");

  const [flip, setFlip] = useState(
    props.G.mapState.discoveredTiles[yLocation][xLocation]
  );
  useEffect(() => {
    setFlip(props.G.mapState.discoveredTiles[yLocation][xLocation]);
  }, [props.G.mapState.discoveredTiles[yLocation][xLocation]]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [fleetTransferOpen, setFleetTransferOpen] = useState(false);

  const myFleetsHere = myPlayerInfo
    ? myPlayerInfo.fleetInfo.filter((f) => f.location[0] === xLocation && f.location[1] === yLocation)
    : [];
  const isKingdomTile = xLocation === 4 && yLocation === 0;
  const buildingHere = props.G.mapState.buildings[yLocation]?.[xLocation];
  const myBuildingHere = buildingHere?.player?.id === myPlayerID && (buildingHere.buildings === "outpost" || buildingHere.buildings === "colony");
  const showManageFleets = myFleetsHere.length >= 2 || (myFleetsHere.length >= 1 && (isKingdomTile || myBuildingHere));

  // ── Droppable zone for drag-and-drop fleet deployment ───────────────────
  const droppableId = `map-tile-${xLocation}-${yLocation}`;
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: droppableId });

  const isDragActive = !!props.fleetDragState;
  const isSourceTile =
    isDragActive &&
    props.fleetDragState!.sourceLocation[0] === xLocation &&
    props.fleetDragState!.sourceLocation[1] === yLocation;
  const isValidDest =
    isDragActive &&
    !isSourceTile &&
    props.fleetDragState!.validDestinations.some(([x, y]) => x === xLocation && y === yLocation);
  const tileKey = `${xLocation},${yLocation}`;
  const tileCost = isDragActive ? props.fleetDragState!.costMap.get(tileKey) : undefined;
  const isInvalidTile = isDragActive && !isSourceTile && !isValidDest && flip;

  const locationPresentation = getLocationPresentation(props.G.mapState.currentTileArray, [
    xLocation,
    yLocation,
  ]);

  const canShowDetail = flip;

  const altOnClick = () => {
    if (props.alternateOnClick) {
      props.alternateOnClick([xLocation, yLocation]);
    }
  };

  useEffect(() => {
    if (props.detailRequestKey !== undefined && flip) {
      setDetailOpen(true);
      props.onDetailRequestHandled?.(props.detailRequestKey);
    }
  }, [flip, props.detailRequestKey, props.onDetailRequestHandled]);

  return (
    <ReactCardFlip isFlipped={flip} key={props.location.toString()}>
      <Button
        value={currentTile.name}
        sx={{
          background: `
            radial-gradient(ellipse 55% 50% at 35% 55%, rgba(160,140,100,0.2) 0%, transparent 100%),
            radial-gradient(ellipse 40% 45% at 65% 40%, rgba(140,125,90,0.15) 0%, transparent 100%),
            linear-gradient(180deg, rgba(46,85,112,0.4) 0%, rgba(58,112,144,0.35) 40%, rgba(45,101,133,0.4) 70%, rgba(40,85,117,0.45) 100%),
            ${backgrounds.mapFog}
          `,
          width: "100%",
          aspectRatio: "1",
          borderRadius: 0,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          // Soft drifting fog — large blurred blobs
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-30%",
            background: `
              radial-gradient(ellipse 40% 35% at 25% 45%, rgba(160,180,200,0.18) 0%, transparent 100%),
              radial-gradient(ellipse 35% 30% at 70% 55%, rgba(160,180,200,0.14) 0%, transparent 100%),
              radial-gradient(ellipse 45% 25% at 50% 75%, rgba(160,180,200,0.12) 0%, transparent 100%)
            `,
            filter: "blur(8px)",
            animation: `${keyframes`
              0%   { transform: translateX(-5%) translateY(0); }
              50%  { transform: translateX(5%) translateY(-3%); }
              100% { transform: translateX(-5%) translateY(0); }
            `} 10s ease-in-out infinite`,
          },
          // Second fog layer — slower, offset
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "-30%",
            background: `
              radial-gradient(ellipse 35% 40% at 60% 35%, rgba(160,180,200,0.12) 0%, transparent 100%),
              radial-gradient(ellipse 40% 30% at 30% 65%, rgba(160,180,200,0.10) 0%, transparent 100%)
            `,
            filter: "blur(10px)",
            animation: `${keyframes`
              0%   { transform: translateX(4%) translateY(-2%); }
              50%  { transform: translateX(-4%) translateY(2%); }
              100% { transform: translateX(4%) translateY(-2%); }
            `} 14s ease-in-out infinite`,
          },
          "&:hover": {
            border: "1px solid rgba(232,184,75,0.3)",
            "&::before, &::after": {
              opacity: 0.5,
            },
          },
        }}
        onClick={
          !props.alternateOnClick
            ? (event) => {
                if (
                  Math.abs(event.clientX - xPosition.current) < 10 &&
                  Math.abs(event.clientY - yPosition.current) < 10
                ) {
                  props.moves.discoverTile([xLocation, yLocation]);
                }
              }
            : () => {}
        }
        {...bind}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "rgba(140,160,180,0.25)",
            boxShadow: "0 0 8px rgba(140,160,180,0.15)",
          }}
        />
      </Button>
      <ThemeProvider theme={baseTheme}>
        <Button
          ref={setDroppableRef}
          className="front"
          sx={{
            backgroundImage: `url(${svgNameToElementMap[currentTile.name]})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            width: "100%",
            aspectRatio: "1",
            border: props.selectable
              ? "5px solid #ffe066"
              : props.battleHighlight
                ? "3px solid #ef4444"
                : isDragActive && isValidDest
                  ? `3px solid rgba(232,184,75,${isOver ? 1 : 0.7})`
                  : "0px",
            borderRadius: 0,
            ...(props.battleHighlight && {
              boxShadow: "0 0 12px rgba(239,68,68,0.5)",
              "@keyframes battlePulse": {
                "0%, 100%": { boxShadow: "0 0 8px rgba(239,68,68,0.3)" },
                "50%": { boxShadow: "0 0 20px rgba(239,68,68,0.6)" },
              },
              animation: "battlePulse 2s ease-in-out infinite",
            }),
            ...(isDragActive && isValidDest && {
              boxShadow: isOver
                ? "0 0 20px rgba(232,184,75,0.8)"
                : "0 0 10px rgba(232,184,75,0.4)",
            }),
          }}
          onClick={props.selectable ? altOnClick : canShowDetail ? () => setDetailOpen(true) : undefined}
        >
          {building()}
          {fort ? <FortIcon colour={fortColour ?? "white"}></FortIcon> : null}
          {/* Infidel Fleet icon */}
          {props.G.infidelFleet?.active &&
            !props.G.infidelFleet.destroyed &&
            props.G.infidelFleet.location[0] === xLocation &&
            props.G.infidelFleet.location[1] === yLocation && (
            <Tooltip title={`Infidel Fleet — ${props.G.infidelFleet.counter.swords}⚔ ${props.G.infidelFleet.counter.shields}🛡`}>
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: "rgba(139,0,0,0.9)",
                  border: "2px solid rgba(255,100,100,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 99,
                  boxShadow: "0 0 8px rgba(139,0,0,0.5)",
                  "@keyframes infidelPulse": {
                    "0%, 100%": { boxShadow: "0 0 6px rgba(139,0,0,0.4)" },
                    "50%": { boxShadow: "0 0 14px rgba(139,0,0,0.7)" },
                  },
                  animation: "infidelPulse 2s ease-in-out infinite",
                }}
              >
                <GiCrossedSwords size={12} style={{ color: "#fff" }} />
              </Box>
            </Tooltip>
          )}
          {positionedFleets.map((pf) => (
            <Box
              key={pf.key}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                position: "absolute",
                top: pf.position.top,
                left: pf.position.left,
                zIndex: 100,
                transform: "translate(-50%, -50%)",
              }}
            >
              {pf.element}
            </Box>
          ))}

          {/* Drag overlay: dark tint for invalid tiles */}
          {isInvalidTile && (
            <Box sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 5,
              pointerEvents: "none",
            }} />
          )}

          {/* Drag overlay: cost badge for valid destinations */}
          {isDragActive && isValidDest && tileCost !== undefined && (
            <Box sx={{
              position: "absolute",
              top: 4,
              right: 4,
              px: "6px",
              py: "2px",
              borderRadius: "8px",
              backgroundColor: "rgba(232,184,75,0.9)",
              fontSize: 10,
              fontWeight: 800,
              color: "#2a1a00",
              zIndex: 10,
              pointerEvents: "none",
              lineHeight: 1.4,
            }}>
              {tileCost}g
            </Box>
          )}

          {/* Infidel host gathering badge */}
          {xLocation === 4 && yLocation === 1 && props.G.accumulatedHosts.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                bottom: 4,
                left: 4,
                display: "flex",
                alignItems: "center",
                gap: "3px",
                px: "5px",
                py: "2px",
                borderRadius: "4px",
                backgroundColor: "rgba(139,0,0,0.85)",
                border: "1px solid rgba(255,100,100,0.4)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                ⚔ {props.G.accumulatedHosts.reduce((sum, h) => sum + h.swords, 0)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 9,
                  color: "rgba(255,200,200,0.8)",
                  lineHeight: 1,
                }}
              >
                ({props.G.accumulatedHosts.length})
              </Typography>
            </Box>
          )}
        </Button>
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm">
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pb: 0,
            }}
          >
            <Box sx={{ pr: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {locationPresentation.name}
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.62)" }}>
                {locationPresentation.reference}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* Square tile image */}
              <Box
                sx={{
                  width: 240,
                  height: 240,
                  flexShrink: 0,
                  borderRadius: 1,
                  backgroundColor: "rgba(0,0,0,0.03)",
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={svgNameToElementMap[currentTile.name]}
                  alt={locationPresentation.name}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Box>
              {/* Tile info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <TileDetailContent tile={currentTile} G={props.G} location={[xLocation, yLocation]} />
                {showManageFleets && (
                  <Box sx={{ mt: 1.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<GiZeppelin size={16} />}
                      onClick={() => setFleetTransferOpen(true)}
                      sx={{ fontSize: "0.82rem", textTransform: "none" }}
                    >
                      Manage Fleets
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
        {showManageFleets && myPlayerInfo && (
          <FleetTransferDialog
            open={fleetTransferOpen}
            onClose={() => setFleetTransferOpen(false)}
            location={[xLocation, yLocation]}
            fleets={myFleetsHere}
            reserves={myPlayerInfo.resources}
            isKingdom={isKingdomTile}
            garrison={myBuildingHere ? {
              buildingType: buildingHere.buildings as "outpost" | "colony",
              regiments: buildingHere.garrisonedRegiments,
              levies: buildingHere.garrisonedLevies,
              eliteRegiments: buildingHere.garrisonedEliteRegiments,
            } : null}
            tileArray={props.G.mapState.currentTileArray}
            moves={props.moves}
          />
        )}
      </ThemeProvider>
    </ReactCardFlip>
  );
});

interface worldMapTileProps extends MyGameProps {
  location: number[];
  alternateOnClick?: (coords: number[]) => void;
  selectable?: boolean;
  battleHighlight?: boolean;
  detailRequestKey?: number;
  onDetailRequestHandled?: (requestKey: number) => void;
  fleetDragState?: FleetDragState | null;
  onFleetDragAttempt?: (reason: string) => void;
}
