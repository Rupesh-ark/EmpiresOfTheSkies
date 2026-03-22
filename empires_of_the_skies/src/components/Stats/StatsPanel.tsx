/**
 * StatsPanel — 4 collapsible cards replacing the old mega-table stats view.
 *
 * Cards:
 *   1. Opponent Summary — compact player cards with key stats
 *   2. Heresy Track — visual horizontal track with player markers
 *   3. NPR Kingdoms — non-player realm status
 *   4. Goods Value — supply/demand price lookup
 *
 * Each card is independently collapsible. Styled with parchment/brass aesthetic.
 */
import { useState } from "react";
import { Box, Typography, Collapse, Tooltip } from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { MyGameProps, PlayerInfo, colourToKingdomMap } from "@eots/game";
import { tokens, IconCounsellor, IconGold, IconVP, IconRegiment, IconElite, IconLevy, IconSkyship, IconFoWCard } from "@/theme";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.png";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.png";

// ── Shared card wrapper ─────────────────────────────────────────────────

const StatsCard = ({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box
      sx={{
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${tokens.ui.border}`,
        backgroundColor: tokens.ui.surface,
        overflow: "hidden",
        boxShadow: tokens.shadow.sm,
      }}
    >
      {/* Header — click to toggle */}
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: `${tokens.spacing.sm}px`,
          py: `${tokens.spacing.xs + 2}px`,
          cursor: "pointer",
          backgroundColor: tokens.ui.surfaceRaised,
          borderBottom: open ? `1px solid ${tokens.ui.border}` : "none",
          "&:hover": { backgroundColor: tokens.ui.surfaceHover },
          transition: `background-color ${tokens.transition.fast}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.accent,
            fontSize: tokens.fontSize.xs,
            fontWeight: 600,
            color: tokens.ui.gold,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
        {open ? (
          <ExpandLess sx={{ fontSize: 16, color: tokens.ui.textMuted }} />
        ) : (
          <ExpandMore sx={{ fontSize: 16, color: tokens.ui.textMuted }} />
        )}
      </Box>

      {/* Content */}
      <Collapse in={open}>
        <Box sx={{ p: `${tokens.spacing.sm}px` }}>{children}</Box>
      </Collapse>
    </Box>
  );
};

// ── Card 1: Opponent Summary ────────────────────────────────────────────

const OpponentSummary = ({ props }: { props: MyGameProps }) => {
  const players = Object.entries(props.G.playerInfo) as [string, PlayerInfo][];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: `${tokens.spacing.xs}px` }}>
      {players.map(([playerId, player]) => {
        const isMe = playerId === props.playerID;
        const isHeretic = player.hereticOrOrthodox === "heretic";
        const heresyVP = isHeretic ? player.heresyTracker : -player.heresyTracker;
        const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;

        // Collect status tags
        const tags: { label: string; color: string }[] = [];
        if (player.isArchprelate) tags.push({ label: "Archprelate", color: "#A74383" });
        if (player.isCaptainGeneral) tags.push({ label: "Captain-General", color: "#2E7D32" });
        if (props.G.eventState.peaceAccordActive) tags.push({ label: "Peace Accord", color: "#D4A017" });
        if (props.G.eventState.dynasticMarriage?.includes(playerId)) {
          const allyId = props.G.eventState.dynasticMarriage[0] === playerId
            ? props.G.eventState.dynasticMarriage[1]
            : props.G.eventState.dynasticMarriage[0];
          tags.push({ label: `Allied: ${props.G.playerInfo[allyId]?.kingdomName}`, color: "#C06090" });
        }
        if (props.G.eventState.schismAffected.includes(playerId)) tags.push({ label: "Schism", color: "#E77B00" });
        if (props.G.eventState.lendersRefuseCredit.includes(playerId) && player.resources.gold < 0) {
          tags.push({ label: "Credit Blocked", color: "#D32F2F" });
        }

        return (
          <Box
            key={playerId}
            sx={{
              px: `${tokens.spacing.sm}px`,
              py: `${tokens.spacing.xs}px`,
              borderRadius: `${tokens.radius.sm}px`,
              border: `1px solid ${isMe ? `${player.colour}44` : tokens.ui.border}`,
              backgroundColor: isMe ? `${player.colour}08` : "transparent",
            }}
          >
            {/* Row 1: Kingdom name + VP */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "2px" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px` }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: player.colour,
                    boxShadow: `0 0 4px ${player.colour}66`,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: tokens.fontSize.sm,
                    color: tokens.ui.text,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {colourToKingdomMap[player.colour]}
                  {isMe && (
                    <Box component="span" sx={{ color: tokens.ui.textMuted, fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, ml: 0.5 }}>
                      (you)
                    </Box>
                  )}
                </Typography>
                {(player.isArchprelate || player.isCaptainGeneral) && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: "3px", ml: "auto" }}>
                    {player.isArchprelate && (
                      <Box
                        component="img"
                        src={popeLogo}
                        alt="Archprelate"
                        sx={{
                          width: 36,
                          height: 36,
                          objectFit: "contain",
                          filter: "sepia(0.6) saturate(1.5) hue-rotate(260deg) brightness(0.9)",
                          opacity: 0.75,
                        }}
                      />
                    )}
                    {player.isCaptainGeneral && (
                      <Box
                        component="img"
                        src={captainGeneralLogo}
                        alt="Captain-General"
                        sx={{
                          width: 36,
                          height: 36,
                          objectFit: "contain",
                          filter: "sepia(0.6) saturate(1.5) hue-rotate(90deg) brightness(0.9)",
                          opacity: 0.75,
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <IconVP style={{ fontSize: 16, color: tokens.ui.gold }} />
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    fontWeight: 700,
                    color: tokens.ui.text,
                    lineHeight: 1,
                  }}
                >
                  {player.resources.victoryPoints}
                </Typography>
              </Box>
            </Box>

            {/* Row 2: Key resources */}
            <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, flexWrap: "wrap" }}>
              <Tooltip title="Counsellors" placement="top" arrow><span><ResourceChip icon={<IconCounsellor />} value={player.resources.counsellors} size="sm" variant={player.resources.counsellors === 0 ? "muted" : "default"} /></span></Tooltip>
              <Tooltip title="Gold" placement="top" arrow><span><ResourceChip icon={<IconGold />} value={player.resources.gold} size="sm" variant={player.resources.gold < 0 ? "negative" : "default"} /></span></Tooltip>
              <Tooltip title="Regiments" placement="top" arrow><span><ResourceChip icon={<IconRegiment />} value={player.resources.regiments} size="sm" variant={player.resources.regiments === 0 ? "muted" : "default"} /></span></Tooltip>
              <Tooltip title="Elite Regiments" placement="top" arrow><span><ResourceChip icon={<IconElite />} value={player.resources.eliteRegiments ?? 0} size="sm" variant={(player.resources.eliteRegiments ?? 0) === 0 ? "muted" : "default"} /></span></Tooltip>
              <Tooltip title="Levies" placement="top" arrow><span><ResourceChip icon={<IconLevy />} value={player.resources.levies} size="sm" variant={player.resources.levies === 0 ? "muted" : "default"} /></span></Tooltip>
              <Tooltip title="Skyships" placement="top" arrow><span><ResourceChip icon={<IconSkyship />} value={player.resources.skyships} size="sm" variant={player.resources.skyships === 0 ? "muted" : "default"} /></span></Tooltip>
              <Tooltip title="Fortune of War Cards" placement="top" arrow><span><ResourceChip icon={<IconFoWCard />} value={player.resources.fortuneCards.length} size="sm" variant={player.resources.fortuneCards.length === 0 ? "muted" : "default"} /></span></Tooltip>

              {/* Allegiance */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  px: `${tokens.spacing.xs}px`,
                  height: 24,
                  borderRadius: `${tokens.radius.pill}px`,
                  border: `1px solid ${alColor}33`,
                  backgroundColor: `${alColor}10`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: alColor,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: tokens.fontSize.xs,
                    fontFamily: tokens.font.body,
                    fontWeight: 600,
                    color: alColor,
                    lineHeight: 1,
                  }}
                >
                  {isHeretic ? "H" : "O"}
                  {heresyVP !== 0 && ` ${heresyVP > 0 ? "+" : ""}${heresyVP}`}
                </Typography>
              </Box>
            </Box>

            {/* Row 3: Status tags (if any) */}
            {tags.length > 0 && (
              <Box sx={{ display: "flex", gap: "4px", flexWrap: "wrap", mt: "3px" }}>
                {tags.map((tag) => (
                  <Typography
                    key={tag.label}
                    sx={{
                      fontSize: 9,
                      fontFamily: tokens.font.body,
                      fontWeight: 700,
                      color: tag.color,
                      border: `1px solid ${tag.color}44`,
                      borderRadius: `${tokens.radius.sm}px`,
                      px: "4px",
                      py: "1px",
                      lineHeight: 1.2,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {tag.label}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// ── Card 2: Heresy Track ────────────────────────────────────────────────

const TRACK_POSITIONS = Array.from({ length: 19 }, (_, i) => i - 9);

const HeresyTrack = ({ props }: { props: MyGameProps }) => {
  const players = Object.entries(props.G.playerInfo) as [string, PlayerInfo][];

  return (
    <Box>
      {/* Track header labels */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: "4px", px: "2px" }}>
        <Typography sx={{ fontSize: 10, fontFamily: tokens.font.body, fontWeight: 700, color: tokens.allegiance.orthodox }}>
          Orthodox
        </Typography>
        <Typography sx={{ fontSize: 10, fontFamily: tokens.font.body, fontWeight: 700, color: tokens.allegiance.heresy }}>
          Heretic
        </Typography>
      </Box>

      {/* Track bar */}
      <Box
        sx={{
          display: "flex",
          borderRadius: `${tokens.radius.sm}px`,
          overflow: "hidden",
          border: `1px solid ${tokens.ui.borderMedium}`,
          height: 24,
        }}
      >
        {TRACK_POSITIONS.map((pos) => {
          const orthodoxVP = -pos;
          const isCenter = pos === 0;
          const isOrthodoxSide = pos < 0;

          // Which players are at this position?
          const playersHere = players.filter(([, p]) => p.heresyTracker === pos);

          return (
            <Box
              key={pos}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                backgroundColor: isCenter
                  ? tokens.ui.surfaceHover
                  : isOrthodoxSide
                    ? `${tokens.allegiance.orthodox}${Math.round(8 + Math.abs(pos) * 2).toString(16).padStart(2, "0")}`
                    : `${tokens.allegiance.heresy}${Math.round(8 + Math.abs(pos) * 2).toString(16).padStart(2, "0")}`,
                borderRight: `1px solid ${tokens.ui.border}`,
                "&:last-child": { borderRight: "none" },
                position: "relative",
              }}
            >
              {playersHere.map(([id, p]) => (
                <Box
                  key={id}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: p.colour,
                    border: `1px solid rgba(0,0,0,0.2)`,
                    boxShadow: `0 1px 2px rgba(0,0,0,0.3)`,
                    flexShrink: 0,
                  }}
                />
              ))}
            </Box>
          );
        })}
      </Box>

      {/* VP scale */}
      <Box sx={{ display: "flex", mt: "2px" }}>
        {TRACK_POSITIONS.map((pos) => (
          <Box
            key={pos}
            sx={{
              flex: 1,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 8,
                fontFamily: tokens.font.body,
                color: tokens.ui.textMuted,
                lineHeight: 1,
              }}
            >
              {pos === 0 ? "0" : pos < 0 ? `+${-pos}` : `+${pos}`}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Player legend */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px`, mt: `${tokens.spacing.xs}px` }}>
        {players.map(([id, p]) => (
          <Box key={id} sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: p.colour,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 10, fontFamily: tokens.font.body, color: tokens.ui.textMuted, lineHeight: 1 }}>
              {p.kingdomName} ({p.heresyTracker})
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ── Card 3: NPR Kingdoms ────────────────────────────────────────────────

const KINGDOM_SLOT_MAP: Record<string, number> = {
  Angland: 1, Gallois: 2, Castillia: 3, Zeeland: 4,
  Venoa: 5, Nordmark: 6, Ostreich: 7, Constantium: 8,
};

const NprKingdoms = ({ props }: { props: MyGameProps }) => {
  const nprKingdoms = Object.keys(props.G.nprCathedrals);
  const republics = ["Zeeland", "Venoa"];
  const allNpr = [
    ...nprKingdoms,
    ...republics.filter((r) => !nprKingdoms.includes(r)),
  ];

  if (allNpr.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {allNpr.map((kingdom) => {
        const isHeretic = props.G.eventState.nprHeretic.includes(kingdom);
        const cathedrals = props.G.nprCathedrals[kingdom] ?? 0;
        const slot = KINGDOM_SLOT_MAP[kingdom] as keyof typeof props.G.boardState.influencePrelates;
        const controllerID = props.G.boardState.influencePrelates[slot];
        const controllerName = controllerID
          ? props.G.playerInfo[controllerID]?.kingdomName ?? controllerID
          : null;
        const isRepublic = kingdom === "Zeeland" || kingdom === "Venoa";
        const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;

        return (
          <Box
            key={kingdom}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: `${tokens.spacing.xs}px`,
              py: "3px",
              borderRadius: `${tokens.radius.sm}px`,
              border: `1px solid ${tokens.ui.border}`,
              "&:hover": { backgroundColor: tokens.ui.surfaceHover },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px` }}>
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.xs,
                  fontWeight: 600,
                  color: tokens.ui.text,
                  lineHeight: 1.2,
                }}
              >
                {kingdom}
              </Typography>
              {isRepublic && (
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: tokens.font.body,
                    color: tokens.ui.textMuted,
                    border: `1px solid ${tokens.ui.border}`,
                    borderRadius: `${tokens.radius.sm}px`,
                    px: "3px",
                    lineHeight: 1.3,
                  }}
                >
                  Republic
                </Typography>
              )}
              {/* Allegiance dot */}
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: alColor,
                  flexShrink: 0,
                }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
              {cathedrals > 0 && (
                <Typography sx={{ fontSize: 10, fontFamily: tokens.font.body, color: tokens.ui.textMuted, lineHeight: 1 }}>
                  {cathedrals} cath.
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: 10,
                  fontFamily: tokens.font.body,
                  color: controllerName ? tokens.ui.text : tokens.ui.textMuted,
                  fontWeight: controllerName ? 600 : 400,
                  lineHeight: 1,
                }}
              >
                {controllerName ? `Prelate: ${controllerName}` : "Uninfluenced"}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ── Main StatsPanel ─────────────────────────────────────────────────────

export const StatsPanel = (props: MyGameProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: `${tokens.spacing.sm}px`,
        p: `${tokens.spacing.sm}px`,
        overflowY: "auto",
        height: "100%",
      }}
    >
      <StatsCard title="Realm Overview" defaultOpen>
        <OpponentSummary props={props} />
      </StatsCard>

      <StatsCard title="Heresy Track" defaultOpen>
        <HeresyTrack props={props} />
      </StatsCard>

      <StatsCard title="Non-Player Kingdoms">
        <NprKingdoms props={props} />
      </StatsCard>
    </Box>
  );
};
