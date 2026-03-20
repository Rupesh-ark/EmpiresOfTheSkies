import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { ActionRow, RowHeader, ActionBoardProps } from "./shared";
import HolyDecreeDialog from "./HolyDecreeDialog";
import { PlayerDot } from "@/components/atoms/PlayerDot";

const IssueHolyDecree = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const isArchPrelate =
    props.playerID
      ? props.G.playerInfo[props.playerID].isArchprelate
      : false;

  if (!isArchPrelate) return null;

  const isUsed = props.G.boardState.issueHolyDecree;

  // Find who used it (if used)
  const usedByPid = isUsed
    ? Object.entries(props.G.playerInfo).find(([, p]) => p.isArchprelate)?.[0]
    : null;
  const usedByInfo = usedByPid ? props.G.playerInfo[usedByPid] : null;

  return (
    <>
      <ActionRow
        header={
          <RowHeader
            label="Issue Holy Decree"
            meta={[
              {
                label: "Choose",
                value: "Bless, Curse, Reform Dogma, or Confirm Dogma",
              },
            ]}
            badges={["Archprelate only", "Once per round"]}
          />
        }
      >
        <Box
          onClick={() => {
            if (!isUsed) setDialogOpen(true);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: `${tokens.spacing.sm}px`,
            width: 180,
            height: 56,
            borderRadius: `${tokens.radius.md}px`,
            border: `1px solid ${isUsed ? tokens.ui.border : `${tokens.ui.gold}44`}`,
            background: isUsed
              ? tokens.ui.surface
              : `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surfaceHover} 100%)`,
            cursor: isUsed ? "not-allowed" : "pointer",
            opacity: isUsed ? 0.5 : 1,
            transition: `all ${tokens.transition.fast}`,
            ...(!isUsed && {
              "&:hover": {
                borderColor: `${tokens.ui.gold}66`,
                boxShadow: `0 0 8px ${tokens.ui.gold}20`,
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
            <Typography
              sx={{
                fontFamily: tokens.font.display,
                fontSize: tokens.fontSize.xs,
                color: tokens.ui.gold,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              Issue Decree
            </Typography>
          )}
        </Box>
      </ActionRow>
      <HolyDecreeDialog
        open={dialogOpen}
        {...props}
        setOpen={setDialogOpen}
      />
    </>
  );
};

export default IssueHolyDecree;
