import { useMemo, useState } from "react";
import { GAME_PHASES } from "@eots/game";
import { Box, Chip, Divider, Tab, Tabs, Typography } from "@mui/material";
import { Campaign, Dashboard, Person } from "@mui/icons-material";
import { fonts } from "../designTokens";

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

const sectionCardSx = {
  p: 1.5,
  borderRadius: 2,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.95) 100%)",
  boxShadow: "0 3px 10px rgba(15,23,42,0.07)",
};

const RulesReference = () => {
  const [tab, setTab] = useState("action");

  const phaseSummary = useMemo(
    () => GAME_PHASES.map((phase) => phase.label),
    []
  );

  return (
    <Box sx={{ maxWidth: 1230, mx: "auto", width: "100%", px: 2, py: 1 }}>
      <Typography sx={{ fontFamily: fonts.primary, fontSize: "2rem", mb: 0.4 }}>
        Rules Reference
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
        Quick lookup for action costs, effects, limits, and phase flow.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{
          mb: 1.5,
          "& .MuiTabs-indicator": { height: 3 },
        }}
      >
        <Tab
          value="action"
          icon={<Dashboard fontSize="small" />}
          iconPosition="start"
          label="Action Board"
          sx={{ textTransform: "none", fontWeight: 700 }}
        />
        <Tab
          value="player"
          icon={<Person fontSize="small" />}
          iconPosition="start"
          label="Player Board"
          sx={{ textTransform: "none", fontWeight: 700 }}
        />
        <Tab
          value="phases"
          icon={<Campaign fontSize="small" />}
          iconPosition="start"
          label="Turn Flow"
          sx={{ textTransform: "none", fontWeight: 700 }}
        />
      </Tabs>

      <Divider sx={{ mb: 1.5 }} />

      {tab === "action" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {actionBoardRules.map((section) => (
            <Box key={section.title} sx={sectionCardSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontWeight: 800 }}>{section.title}</Typography>
                {section.badge ? <Chip size="small" label={section.badge} /> : null}
              </Box>
              <Box component="ul" sx={{ m: 0, pl: 2.3 }}>
                {section.bullets.map((bullet) => (
                  <Typography component="li" key={bullet} sx={{ mb: 0.35, lineHeight: 1.35 }}>
                    {bullet}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {tab === "player" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {playerBoardRules.map((section) => (
            <Box key={section.title} sx={sectionCardSx}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{section.title}</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.3 }}>
                {section.bullets.map((bullet) => (
                  <Typography component="li" key={bullet} sx={{ mb: 0.35, lineHeight: 1.35 }}>
                    {bullet}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {tab === "phases" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={sectionCardSx}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Game Phases</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.3 }}>
              {phaseSummary.map((line) => (
                <Typography component="li" key={line} sx={{ mb: 0.35, lineHeight: 1.35 }}>
                  {line}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default RulesReference;
