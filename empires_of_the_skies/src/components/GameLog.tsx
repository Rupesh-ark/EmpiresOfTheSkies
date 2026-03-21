/**
 * GameLog — Timeline-style game event feed.
 *
 * Vertical line on the left with coloured dots per entry.
 * Round changes are larger nodes on the timeline.
 * Styled to match parchment/brass aesthetic.
 */
import { MyGameProps } from "@eots/game";
import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import { tokens } from "@/theme";
import { useState } from "react";

type LogIconKey =
  | "event"
  | "rebellion"
  | "invasion"
  | "fleet"
  | "election"
  | "tax"
  | "trade"
  | "heresy"
  | "peace"
  | "alliance"
  | "fire"
  | "default";

const getLogIcon = (message: string): LogIconKey => {
  const lower = message.toLowerCase();
  if (lower.includes("invasion") || lower.includes("grand army") || lower.includes("captain-general")) return "invasion";
  if (lower.includes("rebellion") || lower.includes("rebels")) return "rebellion";
  if (lower.includes("infidel host") || lower.includes("infidel fleet")) return "fleet";
  if (lower.includes("election") || lower.includes("archprelate")) return "election";
  if (lower.includes("tax") || lower.includes("gold") || lower.includes("crops") || lower.includes("lenders")) return "tax";
  if (lower.includes("trade") || lower.includes("piracy")) return "trade";
  if (lower.includes("heresy") || lower.includes("heretic") || lower.includes("orthodox") || lower.includes("schism")) return "heresy";
  if (lower.includes("peace accord")) return "peace";
  if (lower.includes("marriage") || lower.includes("alliance") || lower.includes("allied")) return "alliance";
  if (lower.includes("fire") || lower.includes("plague") || lower.includes("disaster")) return "fire";
  if (lower.includes("event:")) return "event";
  return "default";
};

const ICON_COLORS: Record<LogIconKey, string> = {
  event:     "#B39DDB",
  rebellion: "#EF5350",
  invasion:  "#FF7043",
  fleet:     "#42A5F5",
  election:  "#AB47BC",
  tax:       "#B8860B",
  trade:     "#66BB6A",
  heresy:    "#E77B00",
  peace:     "#78909C",
  alliance:  "#F06292",
  fire:      "#FF5722",
  default:   "#90A4AE",
};

const GameLog = (props: MyGameProps) => {
  const log = props.G.gameLog ?? [];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (props.matchID) {
      navigator.clipboard.writeText(props.matchID).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Group entries by round, newest round first
  const rounds = new Map<number, string[]>();
  for (const entry of log) {
    if (!rounds.has(entry.round)) {
      rounds.set(entry.round, []);
    }
    rounds.get(entry.round)!.push(entry.message);
  }
  const sortedRounds = [...rounds.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        px: `${tokens.spacing.sm}px`,
        py: `${tokens.spacing.sm}px`,
      }}
    >
      {/* Match ID */}
      {props.matchID && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
            mb: `${tokens.spacing.sm}px`,
            px: `${tokens.spacing.xs}px`,
          }}
        >
          <Typography
            sx={{
              fontSize: 10,
              fontFamily: "monospace",
              color: tokens.ui.textMuted,
              letterSpacing: "0.03em",
            }}
          >
            Match: {props.matchID}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy"} placement="right">
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{ color: copied ? tokens.ui.success : tokens.ui.textMuted, p: 0 }}
            >
              <ContentCopy sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {sortedRounds.length === 0 ? (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            fontStyle: "italic",
            px: `${tokens.spacing.sm}px`,
          }}
        >
          No events logged yet.
        </Typography>
      ) : (
        sortedRounds.map(([round, messages]) => (
          <Box key={round} sx={{ position: "relative", mb: `${tokens.spacing.sm}px` }}>
            {/* Round header node */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: `${tokens.spacing.sm}px`,
                mb: `${tokens.spacing.xs}px`,
              }}
            >
              {/* Large round dot */}
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: tokens.ui.gold,
                  border: `2px solid ${tokens.ui.surfaceRaised}`,
                  boxShadow: `0 0 4px ${tokens.ui.gold}44`,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              />
              <Typography
                sx={{
                  fontFamily: tokens.font.accent,
                  fontSize: tokens.fontSize.xs,
                  fontWeight: 600,
                  color: tokens.ui.gold,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                }}
              >
                Round {round}
              </Typography>
            </Box>

            {/* Timeline entries */}
            {[...messages].reverse().map((msg, idx) => {
              const iconKey = getLogIcon(msg);
              const dotColor = ICON_COLORS[iconKey];
              const isLast = idx === messages.length - 1;

              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    gap: `${tokens.spacing.sm}px`,
                    position: "relative",
                    ml: "3px",
                    minHeight: 20,
                  }}
                >
                  {/* Timeline line + dot */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                      width: 8,
                    }}
                  >
                    {/* Dot */}
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: dotColor,
                        flexShrink: 0,
                        mt: "3px",
                        zIndex: 1,
                      }}
                    />
                    {/* Connecting line */}
                    {!isLast && (
                      <Box
                        sx={{
                          width: "1px",
                          flex: 1,
                          backgroundColor: `${tokens.ui.borderMedium}`,
                        }}
                      />
                    )}
                  </Box>

                  {/* Message */}
                  <Typography
                    sx={{
                      fontFamily: tokens.font.body,
                      fontSize: 11,
                      color: tokens.ui.text,
                      lineHeight: 1.4,
                      pb: `${tokens.spacing.xs}px`,
                    }}
                  >
                    {msg}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ))
      )}
    </Box>
  );
};

export default GameLog;
