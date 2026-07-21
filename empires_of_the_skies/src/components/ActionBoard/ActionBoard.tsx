import { memo } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";
export { ActionHoverProvider } from "./ActionHoverContext";

/** Small-caps group header with a brass rule — scannability in the sheet */
const GroupHeader = ({ label }: { label: string }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, gridColumn: "1 / -1", mt: "4px" }}>
    <Typography sx={{ fontFamily: tokens.font.accent, fontSize: 12, fontWeight: 700, color: tokens.ui.gold, textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1, flexShrink: 0 }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${tokens.ui.gold}44, transparent)` }} />
  </Box>
);

// Row components
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

// Main component

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
          gap: "4px",
          alignContent: "start",
        }}
      >
        {/* Player Order spans full width */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <PlayerOrderRow {...props} />
        </Box>

        <GroupHeader label="Musters & Trade" />
        <RecruitCounsellorsRow {...props} />
        <RecruitRegimentsRow {...props} />
        <PurchaseSkyshipsZeelandRow {...props} />
        <PurchaseSkyshipsVenoaRow {...props} />
        <FoundFactoriesRow {...props} />
        <PunishDissentersRow {...props} />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <ConvertMonarchRow {...props} />
        </Box>

        <GroupHeader label="Construction" />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FoundBuildingsRow {...props} />
        </Box>

        <GroupHeader label="The Church" />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <InfluencePrelatesRow {...props} />
        </Box>
        <Box sx={{ gridColumn: "1 / -1" }}>
          <IssueHolyDecree {...props} />
        </Box>
      </Box>
    </Box>
));

interface ActionBoardProps extends MyGameProps {}
