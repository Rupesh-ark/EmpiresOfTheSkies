import { useMemo, useState } from "react";
import { GAME_PHASES } from "@eots/game";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { Campaign, Dashboard, Person } from "@mui/icons-material";
import { tokens } from "@/theme";

type RuleSection = {
  title: string;
  bullets: string[];
  badge?: string;
};

const actionBoardRules: RuleSection[] = [
  {
    title: "Alter Player Order",
    bullets: [
      "Choose order slots now; the change applies at Reset.",
      "Tax payout by order is 1st: 4 gold through 6th: 9 gold.",
    ],
  },
  {
    title: "Recruit Counsellors",
    bullets: [
      "Cost is 1 gold per counsellor in the row (including the one just placed).",
      "Gain 1 counsellor immediately, up to a maximum of 7.",
    ],
  },
  {
    title: "Recruit Regiments",
    bullets: [
      "Cost is 1 gold plus 1 per counsellor in the row.",
      "Gain 4 regiments in your kingdom; maximum 30 regiments.",
    ],
  },
  {
    title: "Purchase Skyships (Zeeland/Venoa)",
    bullets: [
      "Cost is 2 gold plus 1 per counsellor in the chosen row.",
      "Gain 2 skyships from the selected market; maximum 24 skyships.",
    ],
  },
  {
    title: "Found Buildings",
    bullets: [
      "Cathedral: 5 gold + row cost; Orthodox only; retreat Heresy 1 and gain 2 VP.",
      "Palace: 5 gold + row cost; move Heresy 1 either way; gain 1 VP Orthodox / 2 VP Heretic.",
      "Shipyard: 3 gold + row cost; maximum 3 shipyards.",
      "Fort: 2 gold + row cost; valid placement required.",
    ],
  },
  {
    title: "Found Factories",
    bullets: [
      "Cost is 1 gold plus 1 per counsellor in the row.",
      "Advance factory marker by 1; maximum 6 factories.",
    ],
  },
  {
    title: "Influence Prelates",
    bullets: [
      "Own kingdom slot is free and blocks others.",
      "Non-player realm slot costs 1 gold.",
      "Rival kingdom slot costs gold equal to that kingdom's cathedrals.",
    ],
  },
  {
    title: "Issue Holy Decree",
    badge: "Archprelate only",
    bullets: [
      "Once per round choose: Bless, Curse, Reform Dogma, or Confirm Dogma.",
    ],
  },
];

const playerBoardRules: RuleSection[] = [
  {
    title: "Build Skyships",
    bullets: [
      "If you have shipyards, once per round per shipyard you may build 1 or 2 skyships.",
      "Pay 1 gold per skyship; maximum 24 skyships total.",
    ],
  },
  {
    title: "Conscript Levies",
    bullets: [
      "Gain levies in groups of 3, paying 1 VP per group.",
      "Maximum 12 levies; if fewer than 3 remain, you still pay 1 VP for the final group.",
    ],
  },
  {
    title: "Train Troops",
    bullets: [
      "Draw 2 Fortunes of War cards.",
      "If No Effect is drawn, reveal and redraw; hand limit is 4 cards.",
    ],
  },
  {
    title: "Punish Dissenters",
    bullets: [
      "Cost is 2 gold OR 1 unspent counsellor.",
      "Shift Heresy up/down up to 3 spaces (4 with More Prisons).",
      "Execution costs -1 VP per dissenter.",
    ],
  },
  {
    title: "Convert Monarch",
    bullets: [
      "Cost is 2 gold AND 1 unspent counsellor.",
      "Flip Orthodox/Heretic and release imprisoned dissenters, reversing imprisonment shifts.",
    ],
  },
  {
    title: "Dispatch Skyship Fleet",
    bullets: [
      "Assign up to 5 skyships to a fleet; each ship can carry 1 regiment or levy.",
      "Move up to 4 map squares and pay 1 gold per square moved.",
    ],
  },
];

const SectionCard = ({ section }: { section: RuleSection }) => (
  <Box
    sx={{
      p: 1.5,
      position: "relative",
      borderRadius: `${tokens.radius.md}px`,
      border: `1px solid ${tokens.ui.border}`,
      borderLeft: "3px solid transparent",
      background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
      boxShadow: `inset 0 1px 0 ${tokens.ui.gold}08`,
      "&::before": {
        content: '""',
        position: "absolute",
        left: -3,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
        background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
      },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontWeight: 700,
          fontSize: tokens.fontSize.sm,
          color: tokens.ui.text,
        }}
      >
        {section.title}
      </Typography>
      {section.badge && (
        <Box
          component="span"
          sx={{
            fontSize: tokens.fontSize.xs,
            fontFamily: tokens.font.body,
            fontWeight: 600,
            border: `1px solid ${tokens.ui.gold}33`,
            borderRadius: `${tokens.radius.pill}px`,
            px: 1,
            py: "1px",
            backgroundColor: `${tokens.ui.gold}0a`,
            color: tokens.ui.gold,
          }}
        >
          {section.badge}
        </Box>
      )}
    </Box>
    <Box component="ul" sx={{ m: 0, pl: 2.3 }}>
      {section.bullets.map((bullet) => (
        <Typography
          component="li"
          key={bullet}
          sx={{
            mb: 0.35,
            lineHeight: 1.4,
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            "::marker": { color: `${tokens.ui.gold}88` },
          }}
        >
          {bullet}
        </Typography>
      ))}
    </Box>
  </Box>
);

const tabSx = {
  textTransform: "none" as const,
  fontWeight: 700,
  fontFamily: tokens.font.body,
  fontSize: tokens.fontSize.sm,
  color: tokens.ui.textMuted,
  minHeight: 36,
  "&.Mui-selected": { color: tokens.ui.gold },
};

const RulesReference = () => {
  const [tab, setTab] = useState("action");

  const phaseSummary = useMemo(
    () => GAME_PHASES.map((phase) => phase.label),
    []
  );

  return (
    <Box sx={{ maxWidth: 1230, mx: "auto", width: "100%", px: 2, py: 1.5 }}>
      <Typography
        sx={{
          fontFamily: tokens.font.accent,
          fontSize: tokens.fontSize.lg,
          color: tokens.ui.gold,
          mb: 0.25,
          letterSpacing: 1,
        }}
      >
        Rules Reference
      </Typography>
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.xs,
          color: tokens.ui.textMuted,
          mb: 1.5,
        }}
      >
        Quick lookup for action costs, effects, limits, and phase flow.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{
          mb: 1.5,
          minHeight: 36,
          "& .MuiTabs-indicator": {
            height: 2,
            backgroundColor: tokens.ui.gold,
          },
        }}
      >
        <Tab value="action" icon={<Dashboard sx={{ fontSize: 16 }} />} iconPosition="start" label="Action Board" sx={tabSx} />
        <Tab value="player" icon={<Person sx={{ fontSize: 16 }} />} iconPosition="start" label="Player Board" sx={tabSx} />
        <Tab value="phases" icon={<Campaign sx={{ fontSize: 16 }} />} iconPosition="start" label="Turn Flow" sx={tabSx} />
      </Tabs>

      <Box sx={{ height: "1px", backgroundColor: tokens.ui.border, mb: 1.5 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tab === "action" && actionBoardRules.map((s) => <SectionCard key={s.title} section={s} />)}
        {tab === "player" && playerBoardRules.map((s) => <SectionCard key={s.title} section={s} />)}
        {tab === "phases" && (
          <SectionCard
            section={{ title: "Game Phases", bullets: phaseSummary }}
          />
        )}
      </Box>
    </Box>
  );
};

export default RulesReference;
