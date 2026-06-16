import { Box, Typography, Tooltip } from "@mui/material";
import { tokens } from "@/theme";
import { IconCounsellor, IconGold, IconVP } from "@/theme";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { GamePanel } from "@/components/atoms/GamePanel";
import { SectionHeader } from "./SectionHeader";

interface TreasuryProps {
  availableActions: number;
  maxActions: number;
  gold: number;
  victoryPoints: number;
  heresyTracker: number;
  hereticOrOrthodox: string;
}

export const Treasury = ({
  availableActions,
  maxActions,
  gold,
  victoryPoints,
  heresyTracker,
  hereticOrOrthodox,
}: TreasuryProps) => {
  const isHeretic = hereticOrOrthodox === "heretic";
  const heresyVP = isHeretic ? heresyTracker : -heresyTracker;
  const vpSign = heresyVP > 0 ? "+" : "";
  const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;
  const alLabel = isHeretic ? "Heretic" : "Orthodox";

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Treasury" />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px` }}>
        <Tooltip title={`${availableActions} of ${maxActions} actions remaining this round`} placement="top" arrow>
          <span>
            <ResourceChip
              icon={<IconCounsellor style={{ fontSize: 18, color: tokens.ui.gold }} />}
              value={availableActions}
              label="Actions"
              size="md"
              variant={availableActions === 0 ? "muted" : "default"}
            />
          </span>
        </Tooltip>
        <ResourceChip
          icon={<IconGold style={{ fontSize: 18, color: gold < 0 ? tokens.ui.danger : tokens.ui.gold }} />}
          value={gold}
          label="Gold"
          size="md"
          variant={gold < 0 ? "negative" : "default"}
        />
        <ResourceChip
          icon={<IconVP style={{ fontSize: 18, color: tokens.ui.gold }} />}
          value={victoryPoints}
          label="Victory Points"
          size="md"
        />
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            px: `${tokens.spacing.sm}px`,
            height: 32,
            borderRadius: `${tokens.radius.pill}px`,
            background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
            border: `1px solid ${alColor}44`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: alColor,
              boxShadow: `0 0 4px ${alColor}88`,
              flexShrink: 0,
            }}
          />
          <Typography
            component="span"
            sx={{
              fontSize: tokens.fontSize.sm,
              fontFamily: tokens.font.body,
              fontWeight: 600,
              color: alColor,
              lineHeight: 1,
            }}
          >
            {alLabel}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontSize: tokens.fontSize.sm,
              fontFamily: tokens.font.body,
              fontWeight: 700,
              color: heresyVP >= 0 ? tokens.ui.success : tokens.ui.danger,
              lineHeight: 1,
            }}
          >
            {vpSign}{heresyVP} Victory Points
          </Typography>
        </Box>
      </Box>
    </GamePanel>
  );
};
