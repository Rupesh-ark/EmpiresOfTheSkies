/**
 * ActionBoard shared — unified brass panel styling.
 *
 * Same visual DNA as CollapsedActionRow:
 * dark surface, gold left edge, display font labels, body font meta.
 */
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";

export interface ActionBoardProps extends MyGameProps {}

// Shared tooltip config

/** Standard tooltip delays — change here to update all action tooltips */
export const TOOLTIP_DELAY = { enter: 700, enterNext: 400 } as const;

// Shared rich tooltip for action rows

import { ACTION_INFO } from "../ActionHoverContext";

/** Build rich tooltip content for an action ID */
export const ActionTooltipContent = ({ actionId }: { actionId: string }) => {
  const info = ACTION_INFO[actionId];
  if (!info) return null;
  return (
    <Box sx={{ p: 0.5, maxWidth: 260 }}>
      <Typography sx={{ fontFamily: tokens.font.display, fontSize: 13, fontWeight: 700, color: tokens.ui.text, lineHeight: 1.3 }}>
        {info.title}
      </Typography>
      {info.cost && (
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.gold, fontWeight: 600, mt: 0.25 }}>
          Cost: {info.cost}
        </Typography>
      )}
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.text, lineHeight: 1.4, mt: 0.5 }}>
        {info.description}
      </Typography>
    </Box>
  );
};
