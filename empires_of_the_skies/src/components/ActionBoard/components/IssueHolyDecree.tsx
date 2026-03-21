/**
 * IssueHolyDecree — Archprelate-only action with wax seal button.
 */
import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { tokens, IconOrthodox } from "@/theme";
import { BTN_BG } from "@/assets/actionBoard";
import { ActionBoardProps } from "./shared";
import HolyDecreeDialog from "./HolyDecreeDialog";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { useActionHover } from "../ActionHoverContext";

const IssueHolyDecree = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setHoveredAction } = useActionHover();

  const isArchPrelate =
    props.playerID
      ? props.G.playerInfo[props.playerID].isArchprelate
      : false;

  if (!isArchPrelate) return null;

  const isUsed = props.G.boardState.issueHolyDecree;

  const usedByPid = isUsed
    ? Object.entries(props.G.playerInfo).find(([, p]) => p.isArchprelate)?.[0]
    : null;
  const usedByInfo = usedByPid ? props.G.playerInfo[usedByPid] : null;

  return (
    <>
      <Box
        onMouseEnter={() => setHoveredAction("issue-holy-decree")}
        onMouseLeave={() => setHoveredAction(null)}
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 60,
          py: `${tokens.spacing.sm}px`,
          gap: `${tokens.spacing.md}px`,
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
            background: isUsed
              ? `linear-gradient(180deg, ${tokens.allegiance.orthodox}44 0%, ${tokens.allegiance.orthodox}22 60%, transparent 100%)`
              : `linear-gradient(180deg, ${tokens.allegiance.orthodox} 0%, ${tokens.allegiance.orthodox}55 60%, transparent 100%)`,
          },
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
          opacity: isUsed ? 0.55 : 1,
        }}
      >
        {/* Feathered thumbnail */}
        <Box
          sx={{
            width: 80,
            alignSelf: "stretch",
            flexShrink: 0,
            overflow: "hidden",
            ml: "3px",
          }}
        >
          <Box
            component="img"
            src={BTN_BG.holyDecree}
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.text,
              lineHeight: 1.2,
            }}
          >
            Issue Holy Decree
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: 10,
              color: tokens.allegiance.orthodox,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            Archprelate only
          </Typography>
        </Box>

        {/* Wax seal button */}
        <Box
          onClick={() => {
            if (!isUsed) setDialogOpen(true);
          }}
          sx={{
            width: 52,
            height: 52,
            mr: `${tokens.spacing.md}px`,
            borderRadius: "50%",
            flexShrink: 0,
            cursor: isUsed ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",

            // Wax seal appearance
            background: isUsed
              ? `radial-gradient(circle at 40% 35%, #8B6060 0%, #6B4444 40%, #5A3636 100%)`
              : `radial-gradient(circle at 40% 35%, #C04040 0%, #8B2020 40%, #6B1515 70%, #501010 100%)`,
            boxShadow: isUsed
              ? `inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)`
              : `inset 0 2px 6px rgba(255,180,180,0.25), inset 0 -2px 4px rgba(0,0,0,0.4), 0 3px 8px rgba(80,20,20,0.4), 0 1px 2px rgba(0,0,0,0.3)`,

            // Wax edge texture
            border: isUsed
              ? "2px solid #5A3636"
              : "2px solid #7B1818",

            transition: `all ${tokens.transition.fast}`,

            ...(!isUsed && {
              "&:hover": {
                background: `radial-gradient(circle at 40% 35%, #D04848 0%, #A02828 40%, #7B1818 70%, #601212 100%)`,
                boxShadow: `inset 0 2px 6px rgba(255,180,180,0.3), inset 0 -2px 4px rgba(0,0,0,0.4), 0 4px 12px rgba(80,20,20,0.5), 0 1px 3px rgba(0,0,0,0.4)`,
                transform: "scale(1.05)",
              },
              "&:active": {
                transform: "scale(0.97)",
                boxShadow: `inset 0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)`,
              },
            }),
          }}
        >
          {isUsed && usedByInfo ? (
            <PlayerDot
              colour={usedByInfo.colour}
              initial={usedByInfo.kingdomName[0]}
              size="sm"
              tooltip={usedByInfo.kingdomName}
            />
          ) : (
            <IconOrthodox
              style={{
                fontSize: 22,
                color: "rgba(255,220,200,0.7)",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
              }}
            />
          )}

          {/* Subtle wax drip texture ring */}
          <Box
            sx={{
              position: "absolute",
              inset: -1,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              pointerEvents: "none",
            }}
          />
        </Box>
      </Box>

      <HolyDecreeDialog
        open={dialogOpen}
        {...props}
        setOpen={setDialogOpen}
      />
    </>
  );
};

export default IssueHolyDecree;
