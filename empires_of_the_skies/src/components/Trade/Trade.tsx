/**
 * Trade — Anytime actions: sell skyships, sell buildings, propose deals,
 *         send agitators, set piracy intent.
 */
import { useState } from "react";
import { Box, Typography, Slider, Button } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps, SKYSHIP_SELL_PRICE, BUILDING_SELL_PRICE } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import { GoodsValue } from "@/components/Stats/GoodsValue";

// ── Compact action row ──────────────────────────────────────────────────

const CompactAction = ({
  label,
  price,
  disabled,
  disabledReason,
  onClick,
}: {
  label: string;
  price: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: `${tokens.spacing.sm}px`,
      py: `${tokens.spacing.xs + 1}px`,
      borderRadius: `${tokens.radius.sm}px`,
      border: `1px solid ${tokens.ui.border}`,
      backgroundColor: tokens.ui.surface,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: `all ${tokens.transition.fast}`,
      ...(!disabled && {
        "&:hover": {
          borderColor: `${tokens.ui.gold}55`,
          backgroundColor: tokens.ui.surfaceHover,
        },
        "&:active": { transform: "scale(0.99)" },
      }),
    }}
  >
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, fontWeight: 600, lineHeight: 1.2 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: 10, color: disabled ? tokens.ui.textMuted : tokens.ui.gold, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", ml: 1 }}>
      {disabled && disabledReason ? disabledReason : price}
    </Typography>
  </Box>
);

// ── Main component ──────────────────────────────────────────────────────

const Trade = (props: MyGameProps) => {
  const playerInfo = props.playerID ? props.G.playerInfo[props.playerID] : null;
  const [sellSkyshipsOpen, setSellSkyshipsOpen] = useState(false);
  const [skyshipAmount, setSkyshipAmount] = useState(1);
  const [agitatorsOpen, setAgitatorsOpen] = useState(false);
  const [agitatorTarget, setAgitatorTarget] = useState<string | null>(null);

  const skyships = playerInfo?.resources.skyships ?? 0;
  const cathedrals = playerInfo?.cathedrals ?? 0;
  const palaces = playerInfo?.palaces ?? 0;
  const isHeretic = playerInfo?.hereticOrOrthodox === "heretic";
  const gold = playerInfo?.resources.gold ?? 0;
  const piracyIntent = playerInfo?.piracyIntent ?? "tax";
  const hasFleets = (playerInfo?.fleetInfo ?? []).length > 0;

  const rivals = props.playerID
    ? Object.entries(props.G.playerInfo)
        .filter(([id]) => id !== props.playerID)
        .map(([id, p]) => ({ id, name: p.kingdomName, colour: p.colour }))
    : [];

  return (
    <Box sx={{ p: `${tokens.spacing.sm}px`, height: "100%" }}>
      <Box sx={{ display: "flex", gap: `${tokens.spacing.md}px`, height: "100%" }}>
        {/* ── Left: Sell Actions ─────────────────────────── */}
        <Box sx={{ minWidth: 200, maxWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: `${tokens.spacing.xs}px` }}>
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.xs,
              fontWeight: 600,
              color: tokens.ui.gold,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              lineHeight: 1,
              mb: "2px",
            }}
          >
            Anytime Actions
          </Typography>

          {skyships > 0 && (
            <CompactAction
              label={`Sell Skyships (${skyships})`}
              price={`${SKYSHIP_SELL_PRICE}g each`}
              onClick={() => { setSkyshipAmount(1); setSellSkyshipsOpen(true); }}
            />
          )}

          {isHeretic && cathedrals > 0 && (
            <CompactAction
              label={`Sell Cathedral (${cathedrals})`}
              price={`${BUILDING_SELL_PRICE}g`}
              onClick={() => props.moves.sellBuilding("cathedral")}
            />
          )}

          {palaces > 1 && (
            <CompactAction
              label={`Sell Palace (${palaces})`}
              price={`${BUILDING_SELL_PRICE}g`}
              onClick={() => props.moves.sellBuilding("palace")}
            />
          )}

          {gold >= 2 && (
            <CompactAction
              label="Send Agitators"
              price="2g"
              onClick={() => { setAgitatorTarget(null); setAgitatorsOpen(true); }}
            />
          )}

          {hasFleets && (
            <CompactAction
              label={piracyIntent === "tax" ? "Tax Routes" : "Cut Routes"}
              price={piracyIntent === "tax" ? "→ Cut" : "→ Tax"}
              onClick={() => props.moves.setPiracyIntent(piracyIntent === "tax" ? "cut" : "tax")}
            />
          )}
        </Box>

        {/* ── Right: Goods Value ─────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            borderRadius: `${tokens.radius.md}px`,
            border: `1px solid ${tokens.ui.border}`,
            backgroundColor: tokens.ui.surface,
            overflow: "hidden",
            boxShadow: tokens.shadow.sm,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              px: `${tokens.spacing.sm}px`,
              py: `${tokens.spacing.xs + 2}px`,
              backgroundColor: tokens.ui.surfaceRaised,
              borderBottom: `1px solid ${tokens.ui.border}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.accent,
                fontSize: tokens.fontSize.xs,
                fontWeight: 600,
                color: tokens.ui.gold,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                lineHeight: 1,
              }}
            >
              Goods Value
            </Typography>
          </Box>
          <Box sx={{ p: `${tokens.spacing.sm}px`, overflowX: "auto" }}>
            <GoodsValue props={props} compact />
          </Box>
        </Box>
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

      {/* ── Send Agitators dialog ─────────────────────── */}
      <DialogShell
        open={agitatorsOpen}
        title="Send Agitators"
        mood="crisis"
        size="xs"
        confirmLabel="Send (−2g)"
        confirmDisabled={!agitatorTarget}
        onConfirm={() => {
          if (agitatorTarget) {
            props.moves.sendAgitators(agitatorTarget);
            setAgitatorsOpen(false);
          }
        }}
        cancelLabel="Cancel"
        onCancel={() => setAgitatorsOpen(false)}
      >
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.text, mb: 2 }}>
          Choose a rival to place a free dissenter on:
        </Typography>
        <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {rivals.map((r) => (
            <Button
              key={r.id}
              onClick={() => setAgitatorTarget(r.id)}
              sx={{
                backgroundColor: r.colour,
                border: agitatorTarget === r.id ? "2px solid black" : "none",
                color: "#000",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { backgroundColor: r.colour, opacity: 0.85 },
              }}
            >
              {r.name}
            </Button>
          ))}
        </Box>
      </DialogShell>
    </Box>
  );
};

export default Trade;
