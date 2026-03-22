/**
 * InfluencePrelatesRow — Rounded-square kingdom-coloured prelate buttons.
 *
 * Each button uses a muted, parchment-blended version of the kingdom colour
 * with a Church (orthodox) or Castle (heretic) icon inside.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { IconOrthodox, IconHeretic } from "@/theme";
import { tokens } from "@/theme";
import { BTN_BG } from "@/assets/actionBoard";
import { PlayerColour } from "@eots/game";
import { ActionBoardProps, ActionTooltipContent, TOOLTIP_DELAY } from "../shared";
import { clearMoves } from "@/utils/gameHelpers";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { useActionHover } from "../../ActionHoverContext";

const KINGDOMS = [
  { name: "Angland",     color: PlayerColour.red,    key: 1 },
  { name: "Gallois",     color: PlayerColour.blue,   key: 2 },
  { name: "Castillia",   color: PlayerColour.yellow, key: 3 },
  { name: "Zeeland",     color: "#FE9F10",           key: 4 },
  { name: "Venoa",       color: "#FE9ACC",           key: 5 },
  { name: "Nordmark",    color: PlayerColour.brown,  key: 6 },
  { name: "Ostreich",    color: PlayerColour.white,  key: 7 },
  { name: "Constantium", color: PlayerColour.green,  key: 8 },
] as const;

const THUMB_W = 80;

const InfluencePrelatesRow = (props: ActionBoardProps) => {
  const { setHoveredAction } = useActionHover();
  const nprHeretics = new Set(props.G.eventState.nprHeretic);

  return (
    <Tooltip title={<ActionTooltipContent actionId="influence-prelates" />} placement="right" arrow enterDelay={TOOLTIP_DELAY.enter} enterNextDelay={TOOLTIP_DELAY.enterNext}>
    <Box
      onMouseEnter={() => setHoveredAction("influence-prelates")}
      onMouseLeave={() => setHoveredAction(null)}
      sx={{
        display: "flex",
        alignItems: "center",
        minHeight: 60,
        py: `${tokens.spacing.xs}px`,
        gap: `${tokens.spacing.sm}px`,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${tokens.ui.border}`,
        borderLeft: "3px solid transparent",
        borderTop: `1px solid ${tokens.ui.gold}12`,
        "&::before": {
          content: '""',
          position: "absolute",
          left: -3,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
          background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
        },
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
      }}
    >
      {/* Feathered thumbnail */}
      <Box
        sx={{
          width: THUMB_W,
          alignSelf: "stretch",
          flexShrink: 0,
          overflow: "hidden",
          ml: "3px",
        }}
      >
        <Box
          component="img"
          src={BTN_BG.influencePrelates}
          alt=""
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            maskImage: "linear-gradient(to right, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 50%, transparent 100%)",
          }}
        />
      </Box>

      {/* Label */}
      <Box sx={{ minWidth: 0, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.text,
            lineHeight: 1.2,
          }}
        >
          Influence Prelates
        </Typography>
      </Box>

      {/* Kingdom buttons */}
      <Box
        sx={{
          display: "flex",
          gap: "3px",
          flex: 1,
          alignSelf: "stretch",
          alignItems: "stretch",
          pr: `${tokens.spacing.sm}px`,
          py: `${tokens.spacing.xs}px`,
        }}
      >
        {KINGDOMS.map((kingdom) => {
          const occupant = props.G.boardState.influencePrelates[
            kingdom.key as keyof typeof props.G.boardState.influencePrelates
          ];
          const occupantInfo = occupant ? props.G.playerInfo[occupant] : null;

          const playerEntry = Object.values(props.G.playerInfo).find(
            (p) => p.kingdomName === kingdom.name
          );
          const isHeretic = playerEntry
            ? playerEntry.hereticOrOrthodox === "heretic"
            : nprHeretics.has(kingdom.name);

          const isSchismAffected = playerEntry
            ? props.G.eventState.schismAffected.includes(playerEntry.id)
            : false;

          const iconColor = "rgba(60,40,20,0.6)";
          const IconComponent = isHeretic ? IconHeretic : IconOrthodox;

          return (
              <Box
                key={kingdom.name}
                onClick={() => {
                  if (!isSchismAffected) {
                    clearMoves(props);
                    props.moves.influencePrelates(kingdom.key - 1);
                  }
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  alignSelf: "stretch",
                  borderRadius: `${tokens.radius.sm}px`,
                  background: `
                    radial-gradient(ellipse at 50% 30%, ${kingdom.color}18 0%, transparent 70%),
                    linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)
                  `,
                  border: `1px solid ${tokens.ui.border}`,
                  borderBottom: `2.5px solid ${kingdom.color}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isSchismAffected ? "not-allowed" : "pointer",
                  position: "relative",
                  transition: `all ${tokens.transition.fast}`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 3px ${kingdom.color}10`,
                  ...(isSchismAffected && {
                    opacity: 0.35,
                    filter: "grayscale(0.6)",
                  }),
                  ...(!isSchismAffected && {
                    "&:hover": {
                      background: `
                        radial-gradient(ellipse at 50% 30%, ${kingdom.color}30 0%, ${kingdom.color}08 70%),
                        linear-gradient(180deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surface} 100%)
                      `,
                      borderColor: `${kingdom.color}55`,
                      borderBottomColor: kingdom.color,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px ${kingdom.color}20`,
                    },
                    "&:active": { transform: "scale(0.96)" },
                  }),
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                  <IconComponent sx={{ fontSize: 13, color: iconColor }} />
                  <Typography
                    sx={{
                      fontFamily: tokens.font.body,
                      fontSize: 8,
                      fontWeight: 700,
                      color: iconColor,
                      lineHeight: 1,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {kingdom.name.slice(0, 3).toUpperCase()}
                  </Typography>
                </Box>

                {/* Schism strikethrough */}
                {isSchismAffected && (
                  <Box
                    sx={{
                      position: "absolute",
                      width: "110%",
                      height: "2px",
                      backgroundColor: tokens.ui.danger,
                      transform: "rotate(-45deg)",
                      borderRadius: 1,
                    }}
                  />
                )}

                {/* Occupant dot */}
                {occupantInfo && (
                  <Box sx={{ position: "absolute", bottom: -3, right: -3 }}>
                    <PlayerDot
                      colour={occupantInfo.colour}
                      initial={occupantInfo.kingdomName[0]}
                      size="sm"
                    />
                  </Box>
                )}
              </Box>
          );
        })}
      </Box>
    </Box>
    </Tooltip>
  );
};

export default InfluencePrelatesRow;
