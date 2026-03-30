import React from "react";
import { Box, Typography } from "@mui/material";
import { GiWatchtower, GiVillage, GiChessKnight, GiHelmet, GiShield, GiZeppelin, GiCrossedSwords, GiShieldBounces } from "react-icons/gi";
import type { MyGameState } from "@eots/game";

interface TilePresenceProps {
  G: MyGameState;
  x: number;
  y: number;
}

export const TilePresence: React.FC<TilePresenceProps> = ({ G, x, y }) => {
  const building = G.mapState.buildings[y]?.[x];
  const fleetsHere = Object.values(G.playerInfo).flatMap((p) =>
    p.fleetInfo
      .filter((f) => f.location[0] === x && f.location[1] === y && f.skyships > 0)
      .map((f) => ({ ...f, colour: p.colour, kingdom: p.kingdomName }))
  );
  const infidelFleetHere = G.infidelFleet?.active && !G.infidelFleet.destroyed &&
    G.infidelFleet.location[0] === x && G.infidelFleet.location[1] === y;
  const hasBuildingOrFleets = building?.buildings || (building?.fort?.length ?? 0) > 0 || fleetsHere.length > 0 || infidelFleetHere;
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
        {(building?.fort?.length ?? 0) > 0 && (
          <Box sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            px: 1.5, py: 0.5, borderRadius: "4px",
            backgroundColor: "rgba(120,90,50,0.05)",
            border: "1px solid rgba(120,90,50,0.12)",
          }}>
            <GiWatchtower size={13} style={{ color: "#6B4E1E" }} />
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

export default TilePresence;
