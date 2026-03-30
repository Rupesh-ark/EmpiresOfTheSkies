import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { fonts } from "@/designTokens";
import { MyGameProps } from "@eots/game";

export interface ActionBoardProps extends MyGameProps {}

// ── Row badge style ──────────────────────────────────────────────────────────

const rowBadgeStyle = {
  fontSize: "11px",
  border: "1px solid rgba(32,58,84,0.2)",
  borderRadius: "999px",
  padding: "2px 9px",
  backgroundColor: "rgba(225, 236, 246, 0.78)",
  color: "#1f3b58",
  lineHeight: 1.3,
};

// ── RowHeader ────────────────────────────────────────────────────────────────

export const RowHeader = ({
  label,
  meta,
  badges,
  accent,
}: {
  label: string;
  meta?: Array<{ label: string; value: string }>;
  badges?: string[];
  accent?: string;
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 0.75,
      maxWidth: "100%",
      borderLeft: `4px solid ${accent ?? "#386fa4"}`,
      pl: 1,
    }}
  >
    <Typography
      sx={{
        fontFamily: fonts.system,
        fontWeight: 800,
        whiteSpace: "pre-line",
        lineHeight: 1.1,
        fontSize: "1.02rem",
        color: "#1a2733",
      }}
    >
      {label}
    </Typography>
    {meta && meta.length > 0 ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
        {meta.map((item) => (
          <Typography
            key={`${item.label}-${item.value}`}
            sx={{
              fontFamily: fonts.system,
              fontSize: "0.9rem",
              lineHeight: 1.25,
              color: "rgba(0,0,0,0.74)",
            }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 700, color: "#2b445e", mr: 0.5 }}
            >
              {item.label}:
            </Box>
            {item.value}
          </Typography>
        ))}
      </Box>
    ) : null}
    {badges && badges.length > 0 ? (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginTop: "2px",
        }}
      >
        {badges.map((badge, index) => (
          <span key={`${badge}-${index}`} style={rowBadgeStyle}>
            {badge}
          </span>
        ))}
      </div>
    ) : null}
  </Box>
);

// ── ActionRow ────────────────────────────────────────────────────────────────

export const ActionRow = ({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", lg: "360px minmax(0, 1fr)" },
      columnGap: 1.5,
      rowGap: 1,
      alignItems: "center",
      mb: 1.5,
      p: { xs: 1.1, lg: 1.3 },
      borderRadius: 2,
      border: "1px solid rgba(15,23,42,0.12)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.95) 100%)",
      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
    }}
  >
    <Box sx={{ minWidth: 0 }}>{header}</Box>
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "flex-start",
      }}
    >
      {children}
    </Box>
  </Box>
);
