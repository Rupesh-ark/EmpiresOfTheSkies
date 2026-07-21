import { useState } from "react";
import { Box, Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";
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
  onConscript: () => void;
  onSetLevyCount: (count: number) => void;
}

const ConscriptLeviesDialog = ({ open, levyCount, onClose, onConscript, onSetLevyCount }: LevyDialogProps) => (
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
        Choose how many levies to raise (in batches of 3). Costs 1 Victory Point per 3 levies.
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.md}px`, justifyContent: "center" }}>
        <GameButton
          variant="ghost"
          size="sm"
          onClick={() => onSetLevyCount(Math.max(3, levyCount - 3))}
          disabled={levyCount <= 3}
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
          {levyCount}
        </Typography>
        <GameButton
          variant="ghost"
          size="sm"
          onClick={() => onSetLevyCount(Math.min(12, levyCount + 3))}
          disabled={levyCount >= 12}
        >
          +
        </GameButton>
      </Box>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
      <GameButton variant="ghost" onClick={onClose}>Cancel</GameButton>
      <GameButton variant="primary" onClick={onConscript}>
        Conscript {levyCount} Levies
      </GameButton>
    </DialogActions>
  </Dialog>
);

interface KingdomActionsProps {
  colour: string;
  shipyards: number;
  counsellorLocations: {
    buildSkyships: boolean;
    conscriptLevies: boolean;
    trainTroops: boolean;
  };
  moves: MyGameProps["moves"];
  /** "column" — sidebar-style stacked buttons (default); "row" — compact dock strip */
  layout?: "column" | "row";
}

export const KingdomActions = ({
  colour,
  shipyards,
  counsellorLocations,
  moves,
  layout = "column",
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

  const handleConscriptLevies = () => {
    moves.enableDispatchButtons(true);
    moves.conscriptLevies(levyCount);
    setLevyDialogOpen(false);
    setLevyCount(3);
  };

  const isRow = layout === "row";

  const buttons = (
    <Box
      sx={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        flexWrap: isRow ? "wrap" : "nowrap",
        gap: isRow ? "6px" : `${tokens.spacing.sm}px`,
      }}
    >
      <Tooltip
        title={noShipyards && !counsellorLocations.buildSkyships ? "You have no Shipyards yet — click to see where to build one" : ""}
        placement="top"
        arrow
      >
        <span>
          <GameButton
            variant="secondary"
            size={isRow ? "sm" : "md"}
            fullWidth={!isRow}
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
            {isRow ? `Skyships (${shipyards}y)` : `Build Skyships (${shipyards} ${shipyards === 1 ? "yard" : "yards"})`}
          </GameButton>
        </span>
      </Tooltip>

      <GameButton
        variant="secondary"
        size={isRow ? "sm" : "md"}
        fullWidth={!isRow}
        onClick={() => setLevyDialogOpen(true)}
        disabled={counsellorLocations.conscriptLevies}
        disabledReason="Already conscripted this round"
        icon={<CounsellorDot placed={counsellorLocations.conscriptLevies} colour={colour} />}
      >
        {isRow ? "Levies (1VP/3)" : "Conscript Levies (1 VP per 3)"}
      </GameButton>

      <GameButton
        variant="secondary"
        size={isRow ? "sm" : "md"}
        fullWidth={!isRow}
        onClick={() => moves.trainTroops()}
        disabled={counsellorLocations.trainTroops}
        disabledReason="Already trained this round"
        icon={<CounsellorDot placed={counsellorLocations.trainTroops} colour={colour} />}
      >
        {isRow ? "Train (+2 FoW)" : "Train Troops (draw 2 FoW cards)"}
      </GameButton>
    </Box>
  );

  return (
    <>
      {isRow ? (
        buttons
      ) : (
        <GamePanel variant="default" padding="sm">
          <SectionHeader label="Kingdom Actions" />
          {buttons}
        </GamePanel>
      )}

      <BuildSkyshipsDialog
        open={buildDialogOpen}
        shipyards={shipyards}
        onClose={() => setBuildDialogOpen(false)}
        onBuild={handleBuildSkyships}
      />

      <ConscriptLeviesDialog
        open={levyDialogOpen}
        levyCount={levyCount}
        onClose={() => setLevyDialogOpen(false)}
        onConscript={handleConscriptLevies}
        onSetLevyCount={setLevyCount}
      />
    </>
  );
};
