import { Box } from "@mui/material";
import { tokens } from "@/theme";
import { IconRegiment, IconElite, IconLevy, IconSkyship } from "@/theme";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { GamePanel } from "@/components/atoms/GamePanel";
import { SectionHeader } from "./SectionHeader";

interface AvailableForcesProps {
  regiments: number;
  eliteRegiments: number;
  levies: number;
  skyships: number;
}

export const AvailableForces = ({
  regiments,
  eliteRegiments,
  levies,
  skyships,
}: AvailableForcesProps) => {
  const forces = [
    { Icon: IconRegiment, value: regiments, label: "Regiments" },
    { Icon: IconElite, value: eliteRegiments, label: "Elite" },
    { Icon: IconLevy, value: levies, label: "Levies" },
    { Icon: IconSkyship, value: skyships, label: "Skyships" },
  ];

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Available Forces" />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.sm}px` }}>
        {forces.map((f) => (
          <ResourceChip
            key={f.label}
            icon={<f.Icon style={{ fontSize: 18 }} />}
            value={f.value}
            label={f.label}
            size="md"
            variant={f.value === 0 ? "muted" : "default"}
            sx={{
              fontWeight: 600,
              fontSize: "clamp(0.875rem, 1vw, 1.125rem)",
              ...(f.value > 0 && { borderColor: `${tokens.ui.gold}33` }),
            }}
          />
        ))}
      </Box>
    </GamePanel>
  );
};
