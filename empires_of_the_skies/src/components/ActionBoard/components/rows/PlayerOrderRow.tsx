/**
 * PlayerOrderRow — Compact row with feathered thumbnail and numbered position buttons.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { BTN_BG } from "@/assets/actionBoard";
import { ActionBoardProps, ActionTooltipContent, TOOLTIP_DELAY } from "../shared";
import { clearMoves } from "@/utils/gameHelpers";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { useActionHover } from "../../ActionHoverContext";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const THUMB_W = 80;

const PlayerOrderRow = (props: ActionBoardProps) => {
  const { setHoveredAction } = useActionHover();
  const numPlayers = Object.keys(props.G.playerInfo).length;

  const alreadyPlaced = Object.values(props.G.boardState.pendingPlayerOrder).some(
    (id) => id === props.playerID
  );

  return (
    <Tooltip title={<ActionTooltipContent actionId="change-player-order" />} placement="right" arrow enterDelay={TOOLTIP_DELAY.enter} enterNextDelay={TOOLTIP_DELAY.enterNext}>
    <Box
      onMouseEnter={() => setHoveredAction("change-player-order")}
      onMouseLeave={() => setHoveredAction(null)}
      sx={{
        display: "flex",
        alignItems: "center",
        height: 60,
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
          background: alreadyPlaced
            ? `linear-gradient(180deg, ${tokens.ui.gold}44 0%, ${tokens.ui.gold}22 60%, transparent 100%)`
            : `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
        },
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
        opacity: alreadyPlaced ? 0.5 : 1,
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
          src={BTN_BG.changePlayerOrder}
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
      <Box sx={{ flex: 1, minWidth: 0, pr: `${tokens.spacing.sm}px` }}>
        <Typography
          noWrap
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.text,
            lineHeight: 1.2,
          }}
        >
          Player Order
        </Typography>
      </Box>

      {/* Position buttons */}
      <Box sx={{ display: "flex", gap: "4px", flexShrink: 0, pr: `${tokens.spacing.md}px` }}>
        {Array.from({ length: numPlayers }, (_, i) => {
          const slot = (i + 1) as keyof typeof props.G.boardState.pendingPlayerOrder;
          const occupant = props.G.boardState.pendingPlayerOrder[slot];
          const occupantInfo = occupant ? props.G.playerInfo[occupant] : null;
          const isTaken = occupant !== undefined;

          return (
            <Tooltip
              key={i}
              title={occupantInfo ? `${ORDINALS[i]} — ${occupantInfo.kingdomName}` : `${ORDINALS[i]} — available`}
              placement="top"
              arrow
            >
              <Box
                onClick={() => {
                  if (!isTaken && !alreadyPlaced) {
                    clearMoves(props);
                    props.moves.alterPlayerOrder(i);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: `${tokens.radius.sm}px`,
                  border: `1px solid ${isTaken ? "transparent" : tokens.ui.borderMedium}`,
                  backgroundColor: isTaken ? `${occupantInfo!.colour}22` : tokens.ui.surface,
                  cursor: isTaken || alreadyPlaced ? "default" : "pointer",
                  transition: `all ${tokens.transition.fast}`,
                  ...(!isTaken && !alreadyPlaced && {
                    "&:hover": {
                      borderColor: `${tokens.ui.gold}55`,
                      backgroundColor: tokens.ui.surfaceHover,
                    },
                  }),
                }}
              >
                {occupantInfo ? (
                  <PlayerDot
                    colour={occupantInfo.colour}
                    initial={occupantInfo.kingdomName[0]}
                    size="sm"
                    tooltip={occupantInfo.kingdomName}
                  />
                ) : (
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontFamily: tokens.font.body,
                      fontWeight: 600,
                      color: tokens.ui.textMuted,
                      lineHeight: 1,
                    }}
                  >
                    {ORDINALS[i]}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
    </Tooltip>
  );
};

export default PlayerOrderRow;
