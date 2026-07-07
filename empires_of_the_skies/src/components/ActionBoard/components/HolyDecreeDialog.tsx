import { Box, Typography } from "@mui/material";
import { MyGameProps, findMostHereticalKingdoms, findMostOrthodoxKingdoms } from "@eots/game";
import { useState } from "react";
import type { IconType } from "react-icons";
import { DialogShell } from "@/components/atoms/DialogShell";
import { tokens } from "@/theme";
import {
  GiDeathSkull,
  GiAngelWings,
  GiHandcuffs,
  GiBookCover,
  GiBookPile,
} from "react-icons/gi";

// Decree definitions

type DecreeKey = "curse monarch" | "bless monarch" | "inquisition" | "reform dogma" | "confirm dogma";

interface DecreeOption {
  key: DecreeKey;
  label: string;
  description: string;
  needsTarget: boolean;
  icon: IconType;
  accent: string;
}

const DECREES: DecreeOption[] = [
  {
    key: "curse monarch",
    label: "Curse a Heretic",
    description: "Reduce a heretic monarch's VP by the number of orthodox kingdoms \u00F7 3 (rounded down).",
    needsTarget: true,
    icon: GiDeathSkull,
    accent: tokens.ui.danger,
  },
  {
    key: "bless monarch",
    label: "Bless the Faithful",
    description: "Grant VP to the least heretical orthodox monarch, equal to orthodox count \u00F7 3.",
    needsTarget: true,
    icon: GiAngelWings,
    accent: tokens.ui.success,
  },
  {
    key: "inquisition",
    label: "Inquisition",
    description: "Target kingdom releases all imprisoned dissenters. Their heresy advances 2 spaces.",
    needsTarget: true,
    icon: GiHandcuffs,
    accent: tokens.ui.warning,
  },
  {
    key: "reform dogma",
    label: "Reform Dogma",
    description: "All players retreat their heresy tracker one space.",
    needsTarget: false,
    icon: GiBookCover,
    accent: tokens.allegiance.orthodox,
  },
  {
    key: "confirm dogma",
    label: "Confirm Dogma",
    description: "All players advance their heresy tracker one space.",
    needsTarget: false,
    icon: GiBookPile,
    accent: tokens.allegiance.heresy,
  },
];

// Decree card

const DecreeCard = ({
  decree,
  selected,
  disabled,
  disabledReason,
  onSelect,
}: {
  decree: DecreeOption;
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  onSelect: () => void;
}) => {
  const Icon = decree.icon;
  return (
    <Box
      onClick={disabled ? undefined : onSelect}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: `${tokens.spacing.sm}px`,
        px: `${tokens.spacing.sm + 2}px`,
        py: `${tokens.spacing.sm + 2}px`,
        borderRadius: `${tokens.radius.md}px`,
        border: selected
          ? `2px solid ${decree.accent}`
          : `1px solid ${tokens.ui.border}`,
        backgroundColor: selected
          ? `${decree.accent}10`
          : tokens.ui.surface,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: `all ${tokens.transition.fast}`,
        ...(!disabled &&
          !selected && {
            "&:hover": {
              borderColor: `${decree.accent}55`,
              backgroundColor: tokens.ui.surfaceHover,
            },
          }),
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: selected ? `${decree.accent}18` : `${tokens.ui.textMuted}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: `all ${tokens.transition.fast}`,
        }}
      >
        <Icon size={18} style={{ color: selected ? decree.accent : tokens.ui.textMuted }} />
      </Box>

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: tokens.font.accent,
            fontSize: tokens.fontSize.sm,
            fontWeight: 700,
            color: selected ? decree.accent : tokens.ui.text,
            lineHeight: 1.2,
          }}
        >
          {decree.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            lineHeight: 1.35,
            mt: "2px",
          }}
        >
          {disabled && disabledReason ? disabledReason : decree.description}
        </Typography>
      </Box>
    </Box>
  );
};

// Target picker

const TargetPicker = ({
  targets,
  selectedTarget,
  onSelect,
  playerInfo,
}: {
  targets: string[];
  selectedTarget: string;
  onSelect: (id: string) => void;
  playerInfo: MyGameProps["G"]["playerInfo"];
}) => (
  <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
    {targets.map((id) => {
      const info = playerInfo[id];
      const isSelected = id === selectedTarget;
      return (
        <Box
          key={id}
          onClick={() => onSelect(id)}
          sx={{
            px: `${tokens.spacing.sm + 2}px`,
            py: `${tokens.spacing.xs + 1}px`,
            borderRadius: `${tokens.radius.sm}px`,
            backgroundColor: info.colour,
            border: isSelected ? "2px solid #000" : "2px solid transparent",
            cursor: "pointer",
            transition: `all ${tokens.transition.fast}`,
            "&:hover": { opacity: 0.85, transform: "scale(1.03)" },
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              fontWeight: 700,
              color: "#000",
              lineHeight: 1,
            }}
          >
            {info.kingdomName}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

// Main dialog

const HolyDecreeDialog = (props: HolyDecreeDialogProps) => {
  const mostHereticalKingdoms = findMostHereticalKingdoms(props.G);
  const mostOrthodoxKingdoms = findMostOrthodoxKingdoms(props.G);
  const playersWithPrisoners = Object.entries(props.G.playerInfo)
    .filter(([, p]) => p.prisoners > 0)
    .map(([id]) => id);

  const inquisitionDisabled = playersWithPrisoners.length === 0;

  // Track which targeted decree is waiting for a target pick
  const [pendingDecree, setPendingDecree] = useState<DecreeKey | null>(null);

  const fireDecree = (key: DecreeKey, target?: string) => {
    if (target) {
      props.moves.issueHolyDecree(key, target);
    } else {
      props.moves.issueHolyDecree(key);
    }
    props.setOpen(false);
  };

  const handleDecreeClick = (key: DecreeKey) => {
    const decree = DECREES.find((d) => d.key === key)!;
    if (!decree.needsTarget) {
      // No target needed — fire immediately
      fireDecree(key);
      return;
    }

    // Get valid targets for this decree
    const targets =
      key === "curse monarch" ? mostHereticalKingdoms :
      key === "bless monarch" ? mostOrthodoxKingdoms :
      playersWithPrisoners;

    if (targets.length === 1) {
      // Only one valid target — fire immediately
      fireDecree(key, targets[0]);
    } else {
      // Multiple targets — show picker
      setPendingDecree(key);
    }
  };

  const handleTargetSelect = (targetId: string) => {
    if (pendingDecree) {
      fireDecree(pendingDecree, targetId);
    }
  };

  const pendingTargets =
    pendingDecree === "curse monarch" ? mostHereticalKingdoms :
    pendingDecree === "bless monarch" ? mostOrthodoxKingdoms :
    pendingDecree === "inquisition" ? playersWithPrisoners :
    [];

  return (
    <DialogShell
      open={props.open}
      title="Issue Holy Decree"
      subtitle="What is thy divine will, oh mighty Arch Prelate?"
      mood="election"
      size="sm"
      cancelLabel="Cancel"
      onCancel={() => { setPendingDecree(null); props.setOpen(false); }}
    >
      {/* Targeted decrees */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", mb: "8px" }}>
        {DECREES.slice(0, 3).map((d) => {
          const disabled = d.key === "inquisition" ? inquisitionDisabled : false;
          return (
            <DecreeCard
              key={d.key}
              decree={d}
              selected={pendingDecree === d.key}
              disabled={disabled}
              disabledReason={d.key === "inquisition" ? "No player has prisoners" : undefined}
              onSelect={() => handleDecreeClick(d.key)}
            />
          );
        })}
      </Box>

      {/* Dogma decrees (side by side) */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {DECREES.slice(3).map((d) => (
          <DecreeCard
            key={d.key}
            decree={d}
            selected={pendingDecree === d.key}
            disabled={false}
            onSelect={() => handleDecreeClick(d.key)}
          />
        ))}
      </Box>

      {/* Target picker (only when multiple targets) */}
      {pendingDecree && pendingTargets.length > 1 && (
        <Box
          sx={{
            mt: `${tokens.spacing.md}px`,
            pt: `${tokens.spacing.sm}px`,
            borderTop: `1px solid ${tokens.ui.border}`,
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.textMuted,
              fontWeight: 600,
              mb: `${tokens.spacing.xs}px`,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Choose target
          </Typography>
          <TargetPicker
            targets={pendingTargets}
            selectedTarget=""
            onSelect={handleTargetSelect}
            playerInfo={props.G.playerInfo}
          />
        </Box>
      )}
    </DialogShell>
  );
};

interface HolyDecreeDialogProps extends MyGameProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export default HolyDecreeDialog;
