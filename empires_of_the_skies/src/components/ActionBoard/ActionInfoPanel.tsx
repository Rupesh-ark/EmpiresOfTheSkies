/**
 * ActionInfoPanel — shown in the right tab panel when hovering action buttons.
 * Displays the action's title, computed cost (based on board state), and description.
 */
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { useActionHover, ACTION_INFO } from "./ActionHoverContext";
import type { ActionBoardInfo } from "@eots/game";

/** Count occupied slots in a boardState row object */
const countOccupied = (row: Record<number, string | undefined>): number =>
  Object.values(row).filter((v) => v !== undefined).length;

/** Compute the actual gold cost for the next available slot in a row */
const computeRowCost = (
  actionKey: string,
  boardState: ActionBoardInfo | undefined
): string | null => {
  if (!boardState) return null;

  switch (actionKey) {
    case "recruit-counsellors": {
      const filled = countOccupied(boardState.recruitCounsellors);
      if (filled >= 3) return "Full";
      const costs = [1, 1, 2];
      return `${costs[filled]}g + 1 Counsellor`;
    }
    case "recruit-regiments": {
      const filled = countOccupied(boardState.recruitRegiments);
      if (filled >= 6) return "Full";
      const cost = 1 + (filled + 1);
      return `${cost}g + 1 Counsellor`;
    }
    case "skyships-zeeland": {
      const filled = countOccupied(boardState.purchaseSkyshipsZeeland);
      if (filled >= 6) return "Full";
      const cost = 2 + (filled + 1);
      return `${cost}g + 1 Counsellor`;
    }
    case "skyships-venoa": {
      const filled = countOccupied(boardState.purchaseSkyshipsVenoa);
      if (filled >= 6) return "Full";
      const cost = 2 + (filled + 1);
      return `${cost}g + 1 Counsellor`;
    }
    case "found-factories": {
      const filled = countOccupied(boardState.foundFactories);
      if (filled >= 4) return "Full";
      const cost = 1 + (filled + 1);
      return `${cost}g + 1 Counsellor`;
    }
    case "cathedral": {
      const filled = countOccupied(boardState.foundBuildings);
      const cost = 5 + filled;
      return `${cost}g + 1 Counsellor`;
    }
    case "palace": {
      const filled = countOccupied(boardState.foundBuildings);
      const cost = 5 + filled;
      return `${cost}g + 1 Counsellor`;
    }
    case "shipyard": {
      const filled = countOccupied(boardState.foundBuildings);
      const cost = 3 + filled;
      return `${cost}g + 1 Counsellor`;
    }
    case "fort": {
      const filled = countOccupied(boardState.foundBuildings);
      const cost = 2 + filled;
      return `${cost}g + 1 Counsellor`;
    }
    default:
      return null;
  }
};

interface ActionInfoPanelProps {
  boardState?: ActionBoardInfo;
}

export const ActionInfoPanel = ({ boardState }: ActionInfoPanelProps) => {
  const { hoveredAction } = useActionHover();
  const info = hoveredAction ? ACTION_INFO[hoveredAction] : null;

  if (!info) {
    return (
      <Box sx={{ p: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.md,
            color: tokens.ui.textMuted,
            mb: 1,
          }}
        >
          Action Info
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, fontStyle: "italic" }}>
          Hover over any button to see its details.
        </Typography>
      </Box>
    );
  }

  const computedCost = hoveredAction ? computeRowCost(hoveredAction, boardState) : null;
  const displayCost = computedCost ?? info.cost;

  return (
    <Box sx={{ p: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.fontSize.md,
          color: tokens.ui.text,
          lineHeight: 1.3,
          mb: 0.5,
        }}
      >
        {info.title}
      </Typography>

      {displayCost && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.sm,
            color: computedCost === "Full" ? tokens.ui.danger : tokens.ui.gold,
            fontWeight: 600,
            mb: 1,
          }}
        >
          {computedCost === "Full" ? "Row Full" : `Cost: ${displayCost}`}
        </Typography>
      )}

      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.sm,
          color: tokens.ui.text,
          lineHeight: 1.5,
          maxWidth: 280,
          whiteSpace: "pre-line",
        }}
      >
        {info.description}
      </Typography>

      {info.details && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            lineHeight: 1.5,
            maxWidth: 280,
            whiteSpace: "pre-line",
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${tokens.ui.border}`,
          }}
        >
          {info.details}
        </Typography>
      )}
    </Box>
  );
};
