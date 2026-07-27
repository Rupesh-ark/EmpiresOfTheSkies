import { memo } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";
import { SectionHeader } from "@/components/atoms/SectionHeader";
export { ActionHoverProvider } from "./ActionHoverContext";

/**
 * What you already have, sitting on the control that spends it — you decide
 * whether to build by looking at what you've built. (The Forces tally that
 * sat under Musters & Trade is gone: your troops now read off the dock.)
 */
type Tally = { one: string; many: string; value: number };

const InlineHoldings = (props: ActionBoardProps) => {
  const info = props.playerID ? props.G.playerInfo[props.playerID] : undefined;
  if (!info) return null;
  // Forts live on the map, not the player — the drawer's Holdings has them.
  return (
    <InlineTally
      items={[
        { one: "Cathedral", many: "Cathedrals", value: info.cathedrals },
        { one: "Palace", many: "Palaces", value: info.palaces },
        { one: "Shipyard", many: "Shipyards", value: info.shipyards },
        { one: "Factory", many: "Factories", value: info.factories },
      ]}
    />
  );
};

const InlineTally = ({ items }: { items: Tally[] }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", px: "2px", pb: "2px" }}>
    {items.map(({ one, many, value }) => (
      <Box key={many} sx={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: value > 0 ? tokens.ui.text : tokens.ui.textMuted,
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            lineHeight: 1,
            color: tokens.ui.textMuted,
          }}
        >
          {value === 1 ? one : many}
        </Typography>
      </Box>
    ))}
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

        <SectionHeader sx={{ gridColumn: "1 / -1", mt: "4px" }} label="Musters & Trade" />
        <RecruitCounsellorsRow {...props} />
        <RecruitRegimentsRow {...props} />
        <PurchaseSkyshipsZeelandRow {...props} />
        <PurchaseSkyshipsVenoaRow {...props} />
        <FoundFactoriesRow {...props} />
        <PunishDissentersRow {...props} />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <ConvertMonarchRow {...props} />
        </Box>

        <SectionHeader sx={{ gridColumn: "1 / -1", mt: "4px" }} label="Construction" />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <InlineHoldings {...props} />
        </Box>
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FoundBuildingsRow {...props} />
        </Box>

        <SectionHeader sx={{ gridColumn: "1 / -1", mt: "4px" }} label="The Church" />
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
