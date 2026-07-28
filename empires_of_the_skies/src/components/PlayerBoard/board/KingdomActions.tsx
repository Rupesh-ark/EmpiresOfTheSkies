import { useState } from "react";
import { Box, Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { tokens, backgrounds } from "@/theme";
import { MyGameProps, MAX_LEVIES, LEVY_GROUP_SIZE } from "@eots/game";
import { GamePanel } from "@/components/atoms/GamePanel";
import { GameButton } from "@/components/atoms/GameButton";
import { SectionHeader } from "./SectionHeader";
import { useActionHover } from "@/components/ActionBoard/ActionHoverContext";
import { useToast } from "@/hooks/useToast";

interface CounsellorDotProps {
  placed: boolean;
  colour: string;
}

const CounsellorDot = ({ placed, colour }: CounsellorDotProps) => (
  <Box
    sx={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: placed ? "none" : `2px solid ${tokens.ui.textMuted}`,
      backgroundColor: placed ? colour : "transparent",
      boxShadow: placed ? `0 0 6px ${colour}88` : "none",
      flexShrink: 0,
      transition: `background-color ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`,
    }}
  />
);

interface BuildDialogProps {
  open: boolean;
  shipyards: number;
  onClose: () => void;
  onBuild: (perYard: number) => void;
}

const BuildSkyshipsDialog = ({ open, shipyards, onClose, onBuild }: BuildDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        backgroundColor: tokens.ui.surface,
        border: `1px solid ${tokens.ui.borderMedium}`,
        borderRadius: `${tokens.radius.lg}px`,
      },
    }}
  >
    <DialogTitle sx={{ fontFamily: tokens.font.display, color: tokens.ui.gold, pb: 1 }}>
      Build Skyships
    </DialogTitle>
    <DialogContent>
      <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.text, fontSize: tokens.fontSize.sm }}>
        You have {shipyards} shipyard{shipyards !== 1 ? "s" : ""}. How many skyships per yard?
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
      <GameButton variant="ghost" onClick={onClose}>Cancel</GameButton>
      <GameButton variant="secondary" onClick={() => onBuild(1)}>
        1 per yard ({shipyards}g)
      </GameButton>
      <GameButton variant="primary" onClick={() => onBuild(2)}>
        2 per yard ({shipyards * 2}g)
      </GameButton>
    </DialogActions>
  </Dialog>
);

interface LevyDialogProps {
  open: boolean;
  levyCount: number;
  onClose: () => void;
  onConscript: (amount: number) => void;
  onSetLevyCount: (count: number) => void;
  currentLevies?: number;
  /** Same validator the server runs — returns the rejection message, or null. */
  validateLevyAmount?: (n: number) => string | null;
}

const ConscriptLeviesDialog = ({ open, levyCount, onClose, onConscript, onSetLevyCount, currentLevies, validateLevyAmount }: LevyDialogProps) => {
  const maxAmount = Math.max(1, MAX_LEVIES - (currentLevies ?? 0));
  const amount = Math.min(Math.max(1, levyCount), maxAmount);
  const vpCost = Math.ceil(amount / LEVY_GROUP_SIZE);
  const rejection = validateLevyAmount?.(amount) ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: tokens.ui.surface,
          border: `1px solid ${tokens.ui.borderMedium}`,
          borderRadius: `${tokens.radius.lg}px`,
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: tokens.font.display, color: tokens.ui.gold, pb: 1 }}>
        Conscript Levies
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.text, fontSize: tokens.fontSize.sm, mb: 2 }}>
          Choose how many levies to raise — any number up to the {MAX_LEVIES}-levy supply.
          Costs 1 Victory Point per {LEVY_GROUP_SIZE} levies, or part thereof.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.md}px`, justifyContent: "center" }}>
          <GameButton
            variant="ghost"
            size="sm"
            onClick={() => onSetLevyCount(amount - 1)}
            disabled={amount <= 1}
          >
            −
          </GameButton>
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.lg,
              color: tokens.ui.text,
              fontWeight: 700,
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {amount}
          </Typography>
          <GameButton
            variant="ghost"
            size="sm"
            onClick={() => onSetLevyCount(amount + 1)}
            disabled={amount >= maxAmount}
          >
            +
          </GameButton>
        </Box>
        {rejection && (
          <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.danger, fontSize: tokens.fontSize.xs, mt: 1, textAlign: "center" }}>
            {rejection}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <GameButton variant="ghost" onClick={onClose}>Cancel</GameButton>
        <GameButton variant="primary" onClick={() => onConscript(amount)} disabled={!!rejection}>
          Conscript {amount} {amount === 1 ? "Levy" : "Levies"} (−{vpCost} VP)
        </GameButton>
      </DialogActions>
    </Dialog>
  );
};

interface KingdomActionsProps {
  colour: string;
  shipyards: number;
  counsellorLocations: {
    buildSkyships: boolean;
    conscriptLevies: boolean;
    trainTroops: boolean;
  };
  moves: MyGameProps["moves"];
  /**
   * "column" — sidebar-style stacked buttons (default); "row" — compact strip;
   * "inline" — bare ghost buttons for a group header.
   */
  layout?: "column" | "row" | "inline";
  /**
   * Render only these actions. Lets each muster sit beside what it produces —
   * Train Troops with the Fortunes hand it fills, Build Skyships with the
   * Fleets its hulls crew — while the dialogs stay defined in one place.
   */
  only?: ("skyships" | "levies" | "train")[];
  currentLevies?: number;
  /** Same validator the server runs — returns the rejection message, or null. */
  validateLevyAmount?: (n: number) => string | null;
}

export const KingdomActions = ({
  colour,
  shipyards,
  counsellorLocations,
  moves,
  layout = "column",
  only,
  currentLevies,
  validateLevyAmount,
}: KingdomActionsProps) => {
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [levyDialogOpen, setLevyDialogOpen] = useState(false);
  const [levyCount, setLevyCount] = useState(3);
  const { flashAction } = useActionHover();
  const { showToast } = useToast();

  const noShipyards = shipyards === 0;

  const handleBuildSkyships = (perYard: number) => {
    moves.buildSkyships(perYard);
    setBuildDialogOpen(false);
  };

  const handleConscriptLevies = (amount: number) => {
    moves.enableDispatchButtons(true);
    moves.conscriptLevies(amount);
    setLevyDialogOpen(false);
    setLevyCount(3);
  };

  const isRow = layout === "row";
  const isInline = layout === "inline";
  const shows = (k: "skyships" | "levies" | "train") => !only || only.includes(k);
  const compact = isRow || isInline;

  const buttons = (
    <Box
      sx={
        isInline
        ? { display: "flex", gap: "6px", alignItems: "center", "& > *": { display: "block" } }
        // Row layout is the action column: three equal cells across the full
        // width. Wrapping left a 2+1 orphan and a ragged right edge.
        : isRow
          ? {
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px",
              // One child is a Tooltip's <span> wrapper — inline by default,
              // so fullWidth wouldn't reach the button inside it.
              "& > *": { minWidth: 0, display: "block" },
              // Wear the board's row vocabulary: gold edge stripe, brass
              // hairline, raised gradient. Plain pills read as unfinished
              // next to the action rows directly above.
              "& button": {
                ...backgrounds.actionSurface,
                justifyContent: "flex-start",
                height: 40,
                px: "10px",
                textTransform: "none",
                "&:hover": {
                  borderColor: `${tokens.ui.gold}66`,
                  backgroundColor: tokens.ui.surfaceHover,
                  "&::before": { background: backgrounds.goldAccentHover },
                },
                "&.Mui-disabled::before": { background: backgrounds.goldAccent, opacity: 0.5 },
              },
            }
          : { display: "flex", flexDirection: "column", flexWrap: "nowrap", gap: `${tokens.spacing.sm}px` }
      }
    >
      {shows("skyships") && (
      <Tooltip
        title={noShipyards && !counsellorLocations.buildSkyships ? "You have no Shipyards yet — click to see where to build one" : ""}
        placement="top"
        arrow
      >
        <span>
          <GameButton
            variant={isInline ? "ghost" : "secondary"}
            size={compact ? "sm" : "md"}
            fullWidth={!isInline}
            onClick={() => {
              if (noShipyards) {
                // Guide, don't block: point the player at the Shipyard cell.
                flashAction("shipyard");
                showToast(
                  "Your Kingdom has no Shipyards — build one on the Action Board (Construction → Shipyard).",
                  "info"
                );
                return;
              }
              moves.enableDispatchButtons(true);
              setBuildDialogOpen(true);
            }}
            disabled={counsellorLocations.buildSkyships}
            disabledReason="Already built this round"
            icon={<CounsellorDot placed={counsellorLocations.buildSkyships} colour={colour} />}
            sx={noShipyards ? { opacity: 0.75 } : undefined}
          >
            {compact
              ? `Build Skyships · ${shipyards} ${shipyards === 1 ? "yard" : "yards"}`
              : `Build Skyships (${shipyards} ${shipyards === 1 ? "yard" : "yards"})`}
          </GameButton>
        </span>
      </Tooltip>
      )}

      {shows("levies") && (
      <GameButton
        variant={isInline ? "ghost" : "secondary"}
        size={compact ? "sm" : "md"}
        fullWidth={!isInline}
        onClick={() => setLevyDialogOpen(true)}
        disabled={counsellorLocations.conscriptLevies}
        disabledReason="Already conscripted this round"
        icon={<CounsellorDot placed={counsellorLocations.conscriptLevies} colour={colour} />}
      >
        {compact ? "Conscript Levies" : "Conscript Levies (1 VP per 3)"}
      </GameButton>
      )}

      {shows("train") && (
      <GameButton
        variant={isInline ? "ghost" : "secondary"}
        size={compact ? "sm" : "md"}
        fullWidth={!isInline}
        onClick={() => moves.trainTroops()}
        disabled={counsellorLocations.trainTroops}
        disabledReason="Already trained this round"
        icon={<CounsellorDot placed={counsellorLocations.trainTroops} colour={colour} />}
      >
        {compact ? "Train Troops" : "Train Troops (draw 2 FoW cards)"}
      </GameButton>
      )}
    </Box>
  );

  return (
    <>
      {compact ? (
        buttons
      ) : (
        <GamePanel variant="default" padding="sm">
          <SectionHeader label="Kingdom Actions" />
          {buttons}
        </GamePanel>
      )}

      {/* Only mount what this instance can open — the dock renders two
          KingdomActions with different `only` lists, and mounting both
          dialogs in each gave every dialog a second, unreachable owner. */}
      {shows("skyships") && (
      <BuildSkyshipsDialog
        open={buildDialogOpen}
        shipyards={shipyards}
        onClose={() => setBuildDialogOpen(false)}
        onBuild={handleBuildSkyships}
      />
      )}

      {shows("levies") && (
      <ConscriptLeviesDialog
        open={levyDialogOpen}
        levyCount={levyCount}
        onClose={() => setLevyDialogOpen(false)}
        onConscript={handleConscriptLevies}
        onSetLevyCount={setLevyCount}
        currentLevies={currentLevies}
        validateLevyAmount={validateLevyAmount}
      />
      )}
    </>
  );
};
