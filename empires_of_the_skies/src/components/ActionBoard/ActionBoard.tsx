import { MyGameProps } from "@eots/game";
import { ThemeProvider } from "@emotion/react";
import { generalTheme } from "../themes";

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
  <ThemeProvider theme={generalTheme}>
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginLeft: "20px",
        marginRight: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "1200px",
          width: "100%",
        }}
      >
        <PlayerOrderRow {...props} />
        <RecruitCounsellorsRow {...props} />
        <RecruitRegimentsRow {...props} />
        <PurchaseSkyshipsZeelandRow {...props} />
        <PurchaseSkyshipsVenoaRow {...props} />
        <FoundBuildingsRow {...props} />
        <FoundFactoriesRow {...props} />
        <InfluencePrelatesRow {...props} />
        <PunishDissentersRow {...props} />
        <ConvertMonarchRow {...props} />
        <IssueHolyDecree {...props} />
      </div>
    </div>
  </ThemeProvider>
);

interface ActionBoardProps extends MyGameProps {}
