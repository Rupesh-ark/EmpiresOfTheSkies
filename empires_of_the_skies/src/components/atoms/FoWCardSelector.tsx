import { Chip, Typography } from "@mui/material";
import type { PlayerFortuneOfWarCardInfo } from "@eots/game";

interface FoWCardSelectorProps {
  fowHand: PlayerFortuneOfWarCardInfo[];
  selectedIndex: number | undefined;
  onSelect: (index: number | undefined) => void;
}

/** Optional Fortune of War card selector — renders nothing if hand is empty. */
export const FoWCardSelector = ({
  fowHand,
  selectedIndex,
  onSelect,
}: FoWCardSelectorProps) => {
  if (fowHand.length === 0) return null;

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Play a Fortune of War card (optional)
      </Typography>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {fowHand.map((card, idx) => {
          const label =
            card.sword > 0
              ? `${card.sword} Sword${card.sword > 1 ? "s" : ""}`
              : `${card.shield} Shield${card.shield > 1 ? "s" : ""}`;
          return (
            <Chip
              key={idx}
              label={label}
              onClick={() => onSelect(selectedIndex === idx ? undefined : idx)}
              variant={selectedIndex === idx ? "filled" : "outlined"}
              color={selectedIndex === idx ? "success" : "default"}
              sx={{ cursor: "pointer" }}
            />
          );
        })}
      </div>
    </>
  );
};
