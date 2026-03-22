import { memo } from "react";
import { Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";
export { ActionHoverProvider } from "./ActionHoverContext";
export { ActionInfoPanel } from "./ActionInfoPanel";

// ── Row components ───────────────────────────────────────────────────────────
import PlayerOrderRow from "./components/rows/PlayerOrderRow";
import {
  RecruitCounsellorsRow,
  RecruitRegimentsRow,
  PurchaseSkyshipsZeelandRow,
  PurchaseSkyshipsVenoaRow,
  FoundFactoriesRow,
  ConvertMonarchRow,
} from "./components/rows/SimpleActionRows";
import FoundBuildingsRow from "./components/rows/FoundBuildingsRow";
import InfluencePrelatesRow from "./components/rows/InfluencePrelatesRow";
import PunishDissentersRow from "./components/rows/PunishDissentersRow";
import IssueHolyDecree from "./components/IssueHolyDecree";

// ── Main component ───────────────────────────────────────────────────────────

export const ActionBoard = memo((props: ActionBoardProps) => (
    <Box
      sx={{
        width: "100%",
        px: `${tokens.spacing.sm}px`,
        py: `${tokens.spacing.sm}px`,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          gap: "6px",
          alignContent: "start",
        }}
      >
        {/* Row 1: Player Order spans full width */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <PlayerOrderRow {...props} />
        </Box>

        {/* Slotted actions (numbered slots, stacking cost) */}
        <RecruitCounsellorsRow {...props} />
        <RecruitRegimentsRow {...props} />
        <PurchaseSkyshipsZeelandRow {...props} />
        <PurchaseSkyshipsVenoaRow {...props} />
        <FoundFactoriesRow {...props} />
        <PunishDissentersRow {...props} />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <ConvertMonarchRow {...props} />
        </Box>

        {/* Building actions — single row of 4 */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FoundBuildingsRow {...props} />
        </Box>

        {/* Per-kingdom slots */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <InfluencePrelatesRow {...props} />
        </Box>

        {/* Holy Decree — full width (only if Archprelate) */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <IssueHolyDecree {...props} />
        </Box>
      </Box>
    </Box>
));

interface ActionBoardProps extends MyGameProps {}
