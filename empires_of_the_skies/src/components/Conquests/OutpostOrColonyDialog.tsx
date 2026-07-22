import { MyGameProps, TileLoot } from "@eots/game";
import { Box, Typography } from "@mui/material";
import {
  GiCrossedSwords,
  GiShieldBounces,
  GiWatchtower,
  GiScrollUnfurled,
} from "react-icons/gi";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { tokens } from "@/theme";
import { getLocationPresentation } from "@/utils/locationLabels";
import { IconRegiment } from "@/theme";
import type { ReactNode } from "react";

/* Goods colours & labels */

const GOODS_META: Record<string, { label: string; color: string }> = {
  gold: { label: "Gold", color: "#B8860B" },
  mithril: { label: "Mithril", color: tokens.goods.mithril },
  dragonScales: { label: "Dragon Scales", color: tokens.goods.dragonScales },
  krakenSkin: { label: "Kraken Skin", color: tokens.goods.krakenSkin },
  magicDust: { label: "Magic Dust", color: tokens.goods.magicDust },
  stickyIchor: { label: "Sticky Ichor", color: tokens.goods.stickyIchor },
  pipeweed: { label: "Pipeweed", color: tokens.goods.pipeweed },
  victoryPoints: { label: "VP", color: "#7A3899" },
};

const LootChips = ({ loot }: { loot: TileLoot }) => {
  const entries = Object.entries(GOODS_META)
    .map(([key, meta]) => ({ ...meta, val: loot[key as keyof TileLoot] }))
    .filter((e) => e.val > 0);

  if (entries.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
      {entries.map((e) => (
        <Box
          key={e.label}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: `${tokens.radius.pill}px`,
            background: `${e.color}18`,
            border: `1px solid ${e.color}40`,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: e.color,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: 12,
              fontWeight: 600,
              color: tokens.ui.text,
              lineHeight: 1,
            }}
          >
            {e.val} {e.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* Option card */

const OptionCard = ({
  icon,
  title,
  description,
  lootNode,
  warning,
  onClick,
  accentColor,
  bgTint,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  lootNode?: ReactNode;
  warning?: string;
  onClick: () => void;
  accentColor: string;
  bgTint?: string;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      gap: 1.5,
      p: 1.5,
      borderRadius: `${tokens.radius.md}px`,
      background: bgTint ?? tokens.ui.surface,
      cursor: "pointer",
      transition: `all ${tokens.transition.fast}`,
      "&:hover": {
        background: tokens.ui.surfaceHover,
        boxShadow: tokens.shadow.md,
        transform: "translateY(-2px)",
      },
      "&:active": { transform: "translateY(0)" },
    }}
  >
    {/* Icon column */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: `${tokens.radius.md}px`,
        background: `${accentColor}20`,
        border: `1.5px solid ${accentColor}50`,
        color: accentColor,
        mt: 0.25,
      }}
    >
      {icon}
    </Box>

    {/* Content column */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: tokens.font.accent,
          fontSize: tokens.fontSize.sm,
          fontWeight: 700,
          color: tokens.ui.text,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.xs,
          color: tokens.ui.textMuted,
          lineHeight: 1.4,
          mt: 0.25,
        }}
      >
        {description}
      </Typography>
      {lootNode}
      {warning && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: 12,
            color: tokens.ui.danger,
            mt: 0.5,
            fontStyle: "italic",
          }}
        >
          ⚠ {warning}
        </Typography>
      )}
    </Box>
  </Box>
);

/* Main dialog */

const OutpostOrColonyDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    inCurrentBattle &&
    props.G.conquestState === undefined &&
    props.G.step === "conquest";

  const tile = props.G.mapState.currentTileArray[y][x];
  const { name: tileName } = getLocationPresentation(
    props.G.mapState.currentTileArray,
    [x, y]
  );
  const building = props.G.mapState.buildings[y]?.[x];
  const hasOutpost =
    building?.player?.id === props.playerID &&
    building?.buildings === "outpost";

  return (
    <DecisionPanel
      open={isOpen}
      title={`Claim ${tileName}`}
      subtitle={`Your fleet has reached ${tileName}. Choose how to establish your presence.`}
      mood="discovery"
      width={480}
    >
      {/* Garrison Strength banner */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          mb: 2,
          py: 1,
          px: 2,
          borderRadius: `${tokens.radius.sm}px`,
          background: `${tokens.mood.battle.accent}0A`,
          border: `1px solid ${tokens.mood.battle.accent}25`,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.accent,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: tokens.ui.textMuted,
            mr: 1,
          }}
        >
          Garrison
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <GiCrossedSwords size={15} color={tokens.mood.battle.accent} />
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.md,
              color: tokens.ui.text,
              fontWeight: 700,
            }}
          >
            {tile.sword}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <GiShieldBounces size={15} color={tokens.mood.battle.accent} />
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.md,
              color: tokens.ui.text,
              fontWeight: 700,
            }}
          >
            {tile.shield}
          </Typography>
        </Box>
      </Box>

      {/* Option cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <OptionCard
          icon={<GiWatchtower size={22} />}
          title="Establish Outpost"
          description="Diplomatic claim — score 1 VP and open a basic trade route."
          lootNode={<LootChips loot={tile.loot.outpost} />}
          onClick={() => props.moves.constructOutpost()}
          accentColor={tokens.ui.success}
        />
        <OptionCard
          icon={<IconRegiment size={22} />}
          title="Attempt Conquest"
          description={`Battle the garrison to establish a colony. Greater spoils, but defeat means stranded troops are lost.`}
          lootNode={<LootChips loot={tile.loot.colony} />}
          warning={
            hasOutpost
              ? "Defeat will destroy your existing outpost here."
              : undefined
          }
          onClick={() => props.moves.coloniseLand()}
          accentColor={tokens.mood.battle.accent}
          bgTint={`${tokens.mood.battle.accent}06`}
        />
        <OptionCard
          icon={<GiScrollUnfurled size={22} />}
          title="Pass"
          description="Withdraw without claiming. You may return in a future round."
          onClick={() => props.moves.doNothing()}
          accentColor={tokens.ui.textMuted}
        />
      </Box>
      <Box sx={{ height: 12 }} />
    </DecisionPanel>
  );
};

export default OutpostOrColonyDialog;
