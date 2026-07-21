/**
 * PromptBar — one persistent bar that always answers "what is the game
 * waiting for?". Sits between the map and the dock; never moves.
 *
 * Priority of states:
 *   1. Active map selection  → its prompt + Cancel / Confirm
 *   2. My turn               → contextual prompt + Clear / Pass / Confirm & End Turn
 *   3. Someone else's turn   → waiting line with the phase hint
 */
import { useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { MyGameProps, GAME_PHASES, PlayerInfo } from "@eots/game";
import { tokens, backgrounds } from "@/theme";
import { IconCounsellor, IconGold, IconVP } from "@/theme";
import { GameButton } from "@/components/atoms/GameButton";
import { DialogShell } from "@/components/atoms/DialogShell";
import { clearMoves, getAvailableActions } from "@/utils/gameHelpers";
import { usePiracyIntent } from "@/contexts/PiracyIntentContext";
import { useMapSelection } from "@/contexts/MapSelectionContext";
import { getLocationPresentation } from "@/utils/locationLabels";

/** Ghost GameButtons are styled for parchment; on the dark bar they need this. */
const DARK_GHOST_SX = {
  color: "#E8C860",
  backgroundColor: "rgba(0,0,0,0.3)",
  borderColor: "rgba(200,170,120,0.4)",
  "&:hover": {
    color: "#F5ECD8",
    borderColor: "#E8C860",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
} as const;

const DARK_GHOST_MUTED_SX = {
  ...DARK_GHOST_SX,
  color: "#C8B898",
} as const;

export const PromptBar = (props: MyGameProps) => {
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const { intent: piracyIntent } = usePiracyIntent();
  const mapSelection = useMapSelection();

  if (!props.playerID) {
    // Spectator: still show what the table is waiting on.
    const phase = GAME_PHASES.find((p) => p.key === props.G.stage.phase);
    return (
      <Bar>
        <PromptText muted>{phase?.hint ?? "Watching the match"}</PromptText>
      </Bar>
    );
  }

  const playerInfo = props.G.playerInfo[props.playerID];
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const phase = GAME_PHASES.find((p) => p.key === props.G.stage.phase);
  const phaseHint = phase?.hint ?? "";
  const isActions = props.G.stage.phase === "actions";
  const resources = <ResourceCluster playerInfo={playerInfo} showActions={isActions} />;

  const turnComplete = playerInfo.turnComplete;
  const showConfirmEndTurn = turnComplete && isActions && isMyTurn;
  const showPassButton =
    isMyTurn && (props.G.stage.phase === "discovery" || isActions);
  const showClear = isMyTurn && (props.ctx.numMoves ?? 0) > 0 && isActions;
  const remaining = getAvailableActions(playerInfo);

  // 1) Map selection flow owns the bar while active
  if (mapSelection.selection) {
    return (
      <Bar highlight resources={resources}>
        <PromptText>
          {mapSelection.selection.prompt}
          {mapSelection.selected && (
            <span style={{ color: tokens.ui.success, fontWeight: 700 }}>
              {" — "}
              {getLocationPresentation(props.G.mapState.currentTileArray, mapSelection.selected).name}
              {mapSelection.selection.getSelectionDetail
                ? ` ${mapSelection.selection.getSelectionDetail(mapSelection.selected)}`
                : ""}
            </span>
          )}
        </PromptText>
        <Box sx={{ flex: 1 }} />
        {mapSelection.selection.onCancel && (
          <GameButton variant="ghost" size="sm" sx={DARK_GHOST_MUTED_SX} onClick={mapSelection.cancelSelection}>
            Cancel
          </GameButton>
        )}
        <GameButton
          variant="primary"
          size="sm"
          disabled={!mapSelection.selected}
          onClick={mapSelection.confirmSelection}
        >
          {mapSelection.selection.confirmLabel ?? "Confirm"}
        </GameButton>
      </Bar>
    );
  }

  // 2 + 3) Normal turn state
  const prompt = !isMyTurn
    ? phaseHint
    : isActions
      ? turnComplete
        ? `Action taken — confirm to end your turn (${remaining} action${remaining === 1 ? "" : "s"} left this round)`
        : `${phaseHint} — ${remaining} of ${playerInfo.resources.counsellors} actions remaining`
      : phaseHint;

  return (
    <>
      <Bar highlight={isMyTurn} resources={resources}>
        <PromptText muted={!isMyTurn}>{prompt}</PromptText>
        <Box sx={{ flex: 1 }} />
        {showClear && (
          <GameButton
            variant="ghost"
            size="sm"
            sx={DARK_GHOST_MUTED_SX}
            onClick={() => clearMoves(props)}
          >
            Clear
          </GameButton>
        )}
        {showConfirmEndTurn ? (
          <GameButton
            variant="primary"
            size="sm"
            onClick={() => props.moves.confirmAction(piracyIntent)}
            sx={{
              boxShadow: `0 0 10px ${tokens.ui.gold}44`,
              "@keyframes confirmGlow": {
                "0%, 100%": { boxShadow: `0 0 10px ${tokens.ui.gold}44` },
                "50%": { boxShadow: `0 0 20px ${tokens.ui.gold}66` },
              },
              animation: "confirmGlow 2s ease-in-out infinite",
            }}
          >
            Confirm & End Turn
          </GameButton>
        ) : showPassButton ? (
          <GameButton
            variant="ghost"
            size="sm"
            sx={DARK_GHOST_SX}
            onClick={() => setPassDialogOpen(true)}
          >
            Pass
          </GameButton>
        ) : null}
      </Bar>

      {/* Pass confirmation */}
      <DialogShell
        open={passDialogOpen}
        title="Pass Turn?"
        mood="peacetime"
        size="xs"
        confirmLabel="Confirm Pass"
        confirmColor="error"
        onConfirm={() => {
          setPassDialogOpen(false);
          props.moves.pass(piracyIntent);
        }}
        cancelLabel="Cancel"
        onCancel={() => setPassDialogOpen(false)}
      >
        {isActions && remaining > 0 && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              color: tokens.ui.danger,
              fontSize: tokens.fontSize.sm,
              fontWeight: 600,
              mb: 1,
            }}
          >
            You can still take {remaining} more action{remaining === 1 ? "" : "s"} this round,
            with {playerInfo.resources.gold}g in the treasury.
          </Typography>
        )}
        <Typography sx={{ fontFamily: tokens.font.body, color: tokens.ui.text, fontSize: tokens.fontSize.sm }}>
          You will not be able to make any further moves until the next phase.
        </Typography>
      </DialogShell>
    </>
  );
};

const Bar = ({
  children,
  highlight = false,
  resources,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  resources?: React.ReactNode;
}) => (
  <Box
    sx={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.sm}px`,
      height: 48,
      flexShrink: 0,
      px: `${tokens.spacing.md}px`,
      background: backgrounds.leatherBar,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 8px 14px rgba(0,0,0,0.3)",
      borderTop: highlight
        ? `2px solid ${tokens.ui.gold}aa`
        : `2px solid rgba(200,170,120,0.25)`,
      borderBottom: `1px solid rgba(200,170,120,0.2)`,
      transition: `border-color ${tokens.transition.normal}`,
      // Brass corner brackets
      "&::before, &::after": {
        content: '""',
        position: "absolute",
        width: 14,
        height: 14,
        pointerEvents: "none",
      },
      "&::before": {
        top: 3,
        left: 3,
        borderTop: "2px solid rgba(232,200,96,0.4)",
        borderLeft: "2px solid rgba(232,200,96,0.4)",
      },
      "&::after": {
        bottom: 3,
        right: 3,
        borderBottom: "2px solid rgba(232,200,96,0.4)",
        borderRight: "2px solid rgba(232,200,96,0.4)",
      },
    }}
  >
    {resources && (
      <>
        {resources}
        <Box sx={{ width: "1px", height: 22, backgroundColor: "rgba(200,170,120,0.3)", flexShrink: 0 }} />
      </>
    )}
    {/* Brass marker — ties the bar into the game's ornament language */}
    <Box
      sx={{
        width: 7,
        height: 7,
        flexShrink: 0,
        transform: "rotate(45deg)",
        backgroundColor: highlight ? "#E8C860" : "rgba(200,170,120,0.45)",
        boxShadow: highlight ? "0 0 8px rgba(232,200,96,0.7)" : "none",
        transition: `all ${tokens.transition.normal}`,
      }}
    />
    {children}
  </Box>
);

/** The local player's key resources, styled for the dark bar. */
const ResourceCluster = ({ playerInfo, showActions }: { playerInfo: PlayerInfo; showActions: boolean }) => {
  const isHeretic = playerInfo.hereticOrOrthodox === "heretic";
  const heresyVP = isHeretic ? playerInfo.heresyTracker : -playerInfo.heresyTracker;
  const remaining = getAvailableActions(playerInfo);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
      {showActions && (
        <Tooltip title={`${remaining} of ${playerInfo.resources.counsellors} actions remaining this round`} placement="top" arrow>
          <span>
            <DarkChip
              icon={<IconCounsellor style={{ fontSize: 14, color: "#E8C860" }} />}
              text={`${remaining}/${playerInfo.resources.counsellors}`}
              dim={remaining === 0}
            />
          </span>
        </Tooltip>
      )}
      <Tooltip title="Gold" placement="top" arrow>
        <span>
          <DarkChip
            icon={<IconGold style={{ fontSize: 14, color: playerInfo.resources.gold < 0 ? "#FF8A65" : "#E8C860" }} />}
            text={`${playerInfo.resources.gold}`}
            danger={playerInfo.resources.gold < 0}
          />
        </span>
      </Tooltip>
      <Tooltip title="Victory Points" placement="top" arrow>
        <span>
          <DarkChip icon={<IconVP style={{ fontSize: 14, color: "#E8C860" }} />} text={`${playerInfo.resources.victoryPoints}`} />
        </span>
      </Tooltip>
      <Tooltip
        title={`${isHeretic ? "Heretic" : "Orthodox"} — heresy position ${playerInfo.heresyTracker > 0 ? "+" : ""}${playerInfo.heresyTracker}, worth ${heresyVP > 0 ? "+" : ""}${heresyVP} VP at game end`}
        placement="top"
        arrow
      >
        <span>
          <DarkChip
            icon={
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  display: "inline-block",
                  backgroundColor: isHeretic ? "#FFB74D" : "#CE93D8",
                }}
              />
            }
            text={`${heresyVP > 0 ? "+" : ""}${heresyVP} VP`}
            dim={heresyVP < 0}
          />
        </span>
      </Tooltip>
    </Box>
  );
};

const DarkChip = ({
  icon,
  text,
  dim = false,
  danger = false,
}: {
  icon: React.ReactNode;
  text: string;
  dim?: boolean;
  danger?: boolean;
}) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      px: "9px",
      height: 26,
      borderRadius: `${tokens.radius.pill}px`,
      backgroundColor: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(200,170,120,0.35)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      opacity: dim ? 0.6 : 1,
    }}
  >
    {icon}
    {/* Keyed by value — remounts on change so the pop marks gains/losses */}
    <Typography
      key={text}
      component="span"
      sx={{
        fontFamily: tokens.font.body,
        fontSize: tokens.fontSize.xs,
        fontWeight: 700,
        color: danger ? "#FF8A65" : "#F5ECD8",
        lineHeight: 1,
        whiteSpace: "nowrap",
        "@keyframes chipPop": {
          "0%": { transform: "scale(1.4)", color: "#FFE9A8" },
          "100%": { transform: "scale(1)" },
        },
        animation: "chipPop 350ms ease-out",
        display: "inline-block",
      }}
    >
      {text}
    </Typography>
  </Box>
);

const PromptText = ({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) => (
  <Typography
    noWrap
    sx={{
      fontFamily: tokens.font.body,
      fontSize: tokens.fontSize.sm,
      color: muted ? "#C8B898" : "#F5ECD8",
      fontStyle: muted ? "italic" : "normal",
      lineHeight: 1.2,
      minWidth: 0,
      textShadow: "0 1px 2px rgba(0,0,0,0.6)",
    }}
  >
    {children}
  </Typography>
);
