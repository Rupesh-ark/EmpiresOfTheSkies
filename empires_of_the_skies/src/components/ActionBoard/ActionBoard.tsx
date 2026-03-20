import { Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";

// ── Row components ───────────────────────────────────────────────────────────
import PlayerOrderRow from "./components/rows/PlayerOrderRow";
import RecruitCounsellorsRow from "./components/rows/RecruitCounsellorsRow";
import RecruitRegimentsRow from "./components/rows/RecruitRegimentsRow";
import {
  PurchaseSkyshipsZeelandRow,
  PurchaseSkyshipsVenoaRow,
} from "./components/rows/PurchaseSkyshipsRow";
import FoundBuildingsRow from "./components/rows/FoundBuildingsRow";
import FoundFactoriesRow from "./components/rows/FoundFactoriesRow";
import InfluencePrelatesRow from "./components/rows/InfluencePrelatesRow";
import PunishDissentersRow from "./components/rows/PunishDissentersRow";
import ConvertMonarchRow from "./components/rows/ConvertMonarchRow";
import IssueHolyDecree from "./components/IssueHolyDecree";

// ── Main component ───────────────────────────────────────────────────────────

export const ActionBoard = (props: ActionBoardProps) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      justifyContent: "center",
      px: `${tokens.spacing.md}px`,
      py: `${tokens.spacing.sm}px`,
      backgroundColor: tokens.ui.background,
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        maxWidth: 1200,
        width: "100%",
        gap: "2px",
      }}
    >
      <PlayerOrderRow {...props} />

      {/* Recruitment & Purchase — 2x2 grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2px",
        }}
      >
        <RecruitCounsellorsRow {...props} />
        <RecruitRegimentsRow {...props} />
        <PurchaseSkyshipsZeelandRow {...props} />
        <PurchaseSkyshipsVenoaRow {...props} />
      </Box>

      <FoundBuildingsRow {...props} />
      <FoundFactoriesRow {...props} />
      <InfluencePrelatesRow {...props} />
      <PunishDissentersRow {...props} />
      <ConvertMonarchRow {...props} />
      <IssueHolyDecree {...props} />
    </Box>
  </Box>
);

interface ActionBoardProps extends MyGameProps {}
