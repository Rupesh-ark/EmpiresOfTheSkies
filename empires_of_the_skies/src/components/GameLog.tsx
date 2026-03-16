import { MyGameProps } from "@eots/game";
import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  AttachMoney,
  Church,
  ContentCopy,
  Gavel,
  HowToVote,
  LocalFireDepartment,
  Shield,
  Sailing,
  Warning,
  EmojiEvents,
  Handshake,
  VolunteerActivism,
} from "@mui/icons-material";
import { GiTrumpetFlag } from "react-icons/gi";
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

/** Match a log message to an icon based on keywords */
const getLogIcon = (message: string): LogIconKey => {
  const lower = message.toLowerCase();
  if (lower.includes("invasion") || lower.includes("grand army") || lower.includes("captain-general"))
    return "invasion";
  if (lower.includes("rebellion") || lower.includes("rebels"))
    return "rebellion";
  if (lower.includes("infidel host") || lower.includes("infidel fleet"))
    return "fleet";
  if (lower.includes("election") || lower.includes("archprelate"))
    return "election";
  if (lower.includes("tax") || lower.includes("gold") || lower.includes("crops") || lower.includes("lenders"))
    return "tax";
  if (lower.includes("trade") || lower.includes("piracy"))
    return "trade";
  if (lower.includes("heresy") || lower.includes("heretic") || lower.includes("orthodox") || lower.includes("schism"))
    return "heresy";
  if (lower.includes("peace accord"))
    return "peace";
  if (lower.includes("marriage") || lower.includes("alliance") || lower.includes("allied"))
    return "alliance";
  if (lower.includes("fire") || lower.includes("plague") || lower.includes("disaster"))
    return "fire";
  if (lower.includes("event:"))
    return "event";
  return "default";
};

const ICON_MAP: Record<LogIconKey, { icon: React.ReactNode; color: string }> = {
  event:     { icon: <GiTrumpetFlag style={{ fontSize: 18 }} />, color: "#B39DDB" },
  rebellion: { icon: <Shield sx={{ fontSize: 18 }} />,           color: "#EF5350" },
  invasion:  { icon: <Warning sx={{ fontSize: 18 }} />,          color: "#FF7043" },
  fleet:     { icon: <Sailing sx={{ fontSize: 18 }} />,          color: "#42A5F5" },
  election:  { icon: <HowToVote sx={{ fontSize: 18 }} />,        color: "#AB47BC" },
  tax:       { icon: <AttachMoney sx={{ fontSize: 18 }} />,      color: "#FFD700" },
  trade:     { icon: <EmojiEvents sx={{ fontSize: 18 }} />,      color: "#66BB6A" },
  heresy:    { icon: <Church sx={{ fontSize: 18 }} />,           color: "#E77B00" },
  peace:     { icon: <Gavel sx={{ fontSize: 18 }} />,            color: "#78909C" },
  alliance:  { icon: <Handshake sx={{ fontSize: 18 }} />,        color: "#F06292" },
  fire:      { icon: <LocalFireDepartment sx={{ fontSize: 18 }} />, color: "#FF5722" },
  default:   { icon: <VolunteerActivism sx={{ fontSize: 18 }} />, color: "#90A4AE" },
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
        alignItems: "center",
        width: "100%",
        px: 2,
        pt: 1,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          maxWidth: 1230,
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            background:
              "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
            px: 2,
            py: 1,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: "white",
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          >
            Game Log
          </Typography>
        </Box>
        {props.matchID && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 0.5,
              backgroundColor: "rgba(0,0,0,0.04)",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: "text.secondary",
                fontFamily: "monospace",
                letterSpacing: "0.03em",
              }}
            >
              Match ID: <strong>{props.matchID}</strong>
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy match ID"} placement="left">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ color: copied ? "success.main" : "action.active", p: 0.5 }}
              >
                <ContentCopy sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {sortedRounds.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No events logged yet.
            </Typography>
          </Box>
        ) : (
          sortedRounds.map(([round, messages]) => (
            <Box key={round}>
              <Box
                sx={{
                  px: 2,
                  py: 0.75,
                  backgroundColor: "rgba(0,0,0,0.06)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                >
                  Round {round}
                </Typography>
              </Box>
              <List dense disablePadding>
                {messages.map((msg, idx) => {
                  const iconKey = getLogIcon(msg);
                  const { icon, color } = ICON_MAP[iconKey];
                  return (
                    <div key={idx}>
                      <ListItem sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 32, color }}>
                          {icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={msg}
                          slotProps={{
                            primary: { fontSize: "0.85rem" },
                          }}
                        />
                      </ListItem>
                      {idx < messages.length - 1 && (
                        <Divider variant="inset" component="li" />
                      )}
                    </div>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
};

export default GameLog;
