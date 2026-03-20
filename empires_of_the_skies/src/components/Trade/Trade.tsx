/**
 * Trade — Anytime actions: sell skyships, sell buildings, propose deals.
 */
import { useState } from "react";
import { Box, Typography, Slider } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps, SKYSHIP_SELL_PRICE, BUILDING_SELL_PRICE } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";

// ── Clickable gradient-accent card ──────────────────────────────────────

const TradeCard = ({
  label,
  description,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      p: 1.5,
      position: "relative",
      borderRadius: `${tokens.radius.md}px`,
      border: `1px solid ${tokens.ui.border}`,
      borderLeft: "3px solid transparent",
      background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: `all ${tokens.transition.fast}`,
      "&::before": {
        content: '""',
        position: "absolute",
        left: -3,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
        background: disabled
          ? `linear-gradient(180deg, ${tokens.ui.gold}44 0%, ${tokens.ui.gold}22 60%, transparent 100%)`
          : `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
        transition: `background ${tokens.transition.fast}`,
      },
      ...(!disabled && {
        "&:hover": {
          borderColor: `${tokens.ui.gold}33`,
          background: `linear-gradient(180deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surfaceRaised} 100%)`,
          boxShadow: `0 0 8px ${tokens.ui.gold}10`,
          "&::before": {
            background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
          },
        },
        "&:active": { transform: "scale(0.998)" },
      }),
    }}
  >
    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.text, fontWeight: 700 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mt: 0.25 }}>
      {description}
    </Typography>
  </Box>
);

// ── Main component ──────────────────────────────────────────────────────

const Trade = (props: MyGameProps) => {
  const playerInfo = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const [sellSkyshipsOpen, setSellSkyshipsOpen] = useState(false);
  const [skyshipAmount, setSkyshipAmount] = useState(1);

  const skyships = playerInfo?.resources.skyships ?? 0;
  const cathedrals = playerInfo?.cathedrals ?? 0;
  const palaces = playerInfo?.palaces ?? 0;
  const isHeretic = playerInfo?.hereticOrOrthodox === "heretic";

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: "auto" }}>
      <Typography
        sx={{
          fontFamily: tokens.font.accent,
          fontSize: tokens.fontSize.lg,
          color: tokens.ui.gold,
          mb: 0.5,
          letterSpacing: 1,
        }}
      >
        Trade
      </Typography>
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.xs,
          color: tokens.ui.textMuted,
          mb: 2,
        }}
      >
        These actions can be performed at any time.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TradeCard
          label="Sell Skyships"
          description={`Sell skyships in your kingdom for ${SKYSHIP_SELL_PRICE} gold each. You have ${skyships}.`}
          disabled={skyships <= 0}
          onClick={() => { setSkyshipAmount(1); setSellSkyshipsOpen(true); }}
        />

        {isHeretic && (
          <TradeCard
            label={`Sell Cathedral (${cathedrals})`}
            description={`Sell a cathedral for ${BUILDING_SELL_PRICE} gold.`}
            disabled={cathedrals <= 0}
            onClick={() => props.moves.sellBuilding("cathedral")}
          />
        )}

        <TradeCard
          label={`Sell Palace (${palaces})`}
          description={`Sell a palace for ${BUILDING_SELL_PRICE} gold. Cannot sell your last palace.`}
          disabled={palaces <= 1}
          onClick={() => props.moves.sellBuilding("palace")}
        />

        <TradeCard
          label="Propose Deal"
          description="Offer gold, skyships, or outposts to another player in exchange for theirs."
          disabled
          onClick={() => {}}
        />
      </Box>

      {/* ── Sell Skyships dialog ────────────────────────── */}
      <DialogShell
        open={sellSkyshipsOpen}
        title="Sell Skyships"
        mood="peacetime"
        size="xs"
        confirmLabel={`Sell ${skyshipAmount} for ${skyshipAmount * SKYSHIP_SELL_PRICE}g`}
        onConfirm={() => {
          props.moves.sellSkyships(skyshipAmount);
          setSellSkyshipsOpen(false);
        }}
        cancelLabel="Cancel"
        onCancel={() => setSellSkyshipsOpen(false)}
      >
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text, mb: 2 }}>
          How many skyships to sell? ({skyships} available)
        </Typography>
        <Slider
          value={skyshipAmount}
          onChange={(_, v) => setSkyshipAmount(v as number)}
          min={1}
          max={Math.max(skyships, 1)}
          step={1}
          marks
          valueLabelDisplay="auto"
          sx={{ color: tokens.ui.gold }}
        />
      </DialogShell>
    </Box>
  );
};

export default Trade;
