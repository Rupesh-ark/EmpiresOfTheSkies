import { useState, useRef } from "react";
import { MyGameProps } from "@eots/game";
import { Box, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { DIALOG_PRIORITY } from "@/components/atoms/DialogQueue";
import { tokens } from "@/theme";

/** Shows a battle result summary after any battle resolves. Dismisses on "Continue". */
const BattleResultDialog = ({ G, playerID, ctx }: MyGameProps) => {
const [dismissed, setDismissed] = useState(false);

  const resultKey = G.battleResult
    ? `${G.battleResult.battleType}-${G.battleResult.attackerName}-${G.battleResult.defenderName}-${G.battleResult.outcome}`
    : null;

  const prevKeyRef = useRef<string | null>(null);
  if (resultKey !== prevKeyRef.current) {
    prevKeyRef.current = resultKey;
    setDismissed(false);
  }

  const result = G.battleResult;
  if (!result || dismissed) return null;

  // Show to all players involved or during their turn
  const isRelevant =
    ctx.currentPlayer === playerID ||
    result.attackerName === G.playerInfo[playerID ?? ""]?.kingdomName ||
    result.defenderName === G.playerInfo[playerID ?? ""]?.kingdomName;

  if (!isRelevant) return null;

  const isVictory = result.outcome.includes("+1 VP") || result.outcome.includes("victorious") || result.outcome.includes("colonises") || result.outcome.includes("conquers");
  const isDefeat = result.outcome.includes("failed") || result.outcome.includes("defeated") || result.outcome.includes("loses") || result.outcome.includes("overwhelm");

  return (
    <DialogShell
      open
      title="Battle Result"
      mood="battle"
      size="sm"
      priority={DIALOG_PRIORITY.battleResult}
      confirmLabel="Continue"
      onConfirm={() => setDismissed(true)}
    >
      {/* Battle type header */}
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.fontSize.md,
          color: tokens.ui.textMuted,
          mb: 2,
        }}
      >
        {result.battleType}
      </Typography>

      {/* Combatants with swords/shields */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 2 }}>
        <CombatantCard
          name={result.attackerName}
          label="Attacker"
          swords={result.attackerSwords}
          shields={result.attackerShields}
          fow={result.attackerFoW}
          losses={result.attackerLosses}
        />
        <Box sx={{ display: "flex", alignItems: "center", px: 1 }}>
          <Typography sx={{ fontFamily: tokens.font.display, fontSize: "1.5rem", color: tokens.ui.textMuted }}>
            vs
          </Typography>
        </Box>
        <CombatantCard
          name={result.defenderName}
          label="Defender"
          swords={result.defenderSwords}
          shields={result.defenderShields}
          fow={result.defenderFoW}
          losses={result.defenderLosses}
        />
      </Box>

      {/* Outcome */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: `${tokens.radius.md}px`,
          backgroundColor: isVictory
            ? "rgba(46, 125, 50, 0.1)"
            : isDefeat
            ? "rgba(198, 40, 40, 0.1)"
            : "rgba(0, 0, 0, 0.05)",
          border: `1px solid ${
            isVictory ? "rgba(46, 125, 50, 0.3)" : isDefeat ? "rgba(198, 40, 40, 0.3)" : tokens.ui.borderMedium
          }`,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.md,
            color: isVictory ? "#2e7d32" : isDefeat ? "#c62828" : tokens.ui.text,
          }}
        >
          {result.outcome}
        </Typography>
      </Box>
    </DialogShell>
  );
};

/** A single combatant's stats in the result dialog */
const CombatantCard = ({
  name,
  label,
  swords,
  shields,
  fow,
  losses,
}: {
  name: string;
  label: string;
  swords: number;
  shields: number;
  fow: { sword: number; shield: number } | null;
  losses: string;
}) => (
  <Box
    sx={{
      flex: 1,
      p: 1.5,
      borderRadius: `${tokens.radius.md}px`,
      border: `1px dashed ${tokens.ui.borderMedium}`,
      backgroundColor: "rgba(0,0,0,0.02)",
    }}
  >
    <Typography sx={{ fontSize: "0.7rem", color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, mb: 1 }}>
      {name}
    </Typography>
    <Typography sx={{ fontSize: "0.85rem", mb: 0.5 }}>
      {swords} Swords / {shields} Shields
    </Typography>
    {fow && (fow.sword > 0 || fow.shield > 0) && (
      <Typography sx={{ fontSize: "0.8rem", color: tokens.ui.textMuted }}>
        FoW: {fow.sword > 0 ? `+${fow.sword}S` : ""}{fow.sword > 0 && fow.shield > 0 ? " " : ""}{fow.shield > 0 ? `+${fow.shield}Sh` : ""}
      </Typography>
    )}
    <Typography sx={{ fontSize: "0.8rem", color: tokens.ui.textMuted, mt: 0.5 }}>
      Losses: {losses}
    </Typography>
  </Box>
);

export default BattleResultDialog;
