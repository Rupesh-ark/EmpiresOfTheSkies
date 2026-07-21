import { ReactNode, useState } from "react";
import { Chip, Typography } from "@mui/material";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";
import type { LegacyCardInfo } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";

// Shared wrapper for the 4 chip-selection branches

type EventChoiceSelection = string | number | LegacyCardInfo | [number, number];

const isLegacyCardSelection = (
  selection: EventChoiceSelection | undefined
): selection is LegacyCardInfo =>
  typeof selection === "object" && selection !== null && !Array.isArray(selection);

const isColonySelection = (
  selection: EventChoiceSelection | undefined
): selection is [number, number] => Array.isArray(selection);

const ChipChoice = ({
  title,
  description,
  chips,
  confirmLabel,
  confirmVariant = "primary",
  confirmDisabled,
  onConfirm,
}: {
  title: string;
  description: string;
  chips: ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  confirmDisabled: boolean;
  onConfirm: () => void;
}) => (
  <DecisionPanel
    open
    title={title}
    mood="crisis"
    actions={
      <GameButton variant={confirmVariant} disabled={confirmDisabled} onClick={onConfirm}>
        {confirmLabel}
      </GameButton>
    }
  >
    <Typography variant="body2" sx={{ mb: 1.5 }}>
      {description}
    </Typography>
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {chips}
    </div>
  </DecisionPanel>
);

// Main component

const EventChoiceDialog = (props: MyGameProps) => {
  const [selected, setSelected] = useState<EventChoiceSelection | undefined>(undefined);

  const choice = props.G.eventState.pendingChoice;
  if (!choice) return null;
  if (choice.targetPlayerID !== props.playerID) return null;

  const def = EVENT_CARD_DEFS[choice.card];
  const resolve = () => props.moves.resolveEventChoice(selected);

  // Binary options — direct buttons, no selection state

  if (choice.binaryOptions) {
    const formatLabel = (opt: string): string => {
      if (opt.startsWith("pay_gold:")) return `Pay ${opt.split(":")[1]} Gold`;
      if (opt === "sell_factory") return "Sell One Factory (gain 3 gold)";
      if (opt === "lose_cathedral") return "Lose One Cathedral (gain 3 gold)";
      if (opt === "lose_vp") return "Lose 3 Victory Points";
      return opt;
    };

    return (
      <DecisionPanel open title={def.displayName} mood="crisis">
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {def.description}
        </Typography>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", paddingBottom: 12 }}>
          {choice.binaryOptions.map((opt) => (
            <GameButton key={opt} variant="danger" onClick={() => props.moves.resolveEventChoice(opt)}>
              {formatLabel(opt)}
            </GameButton>
          ))}
        </div>
      </DecisionPanel>
    );
  }

  // Chip-selection branches — build chips, render once

  let title: string;
  let description: string;
  let confirmLabel: string;
  let confirmVariant: "primary" | "danger" = "primary";
  let chips: ReactNode;

  if (choice.buildingOptions) {
    title = "The Great Fire";
    description = "A fire destroys one of your grand buildings. Choose which to lose:";
    confirmLabel = "Lose Building";
    confirmVariant = "danger";

    chips = choice.buildingOptions.map((type) => (
      <Chip
        key={type}
        label={type.charAt(0).toUpperCase() + type.slice(1)}
        onClick={() => setSelected(type)}
        variant={selected === type ? "filled" : "outlined"}
        color={selected === type ? "error" : "default"}
        sx={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
      />
    ));
  } else if (choice.legacyOptions) {
    title = "Royal Succession";
    description = "Your legacy card has been scored. Choose a new one:";
    confirmLabel = "Choose Card";

    chips = choice.legacyOptions.map((card) => {
      const isSelected =
        isLegacyCardSelection(selected) &&
        selected.name === card.name &&
        selected.colour === card.colour;
      return (
        <Chip
          key={`${card.name}-${card.colour}`}
          label={`${card.name} (${card.colour})`}
          onClick={() => setSelected(card)}
          variant={isSelected ? "filled" : "outlined"}
          color={isSelected ? "primary" : "default"}
          sx={{
            cursor: "pointer",
            fontSize: "13px",
            padding: "4px",
            borderColor: card.colour === "orange" ? "#E77B00" : "#A74383",
            ...(!isSelected && { color: card.colour === "orange" ? "#E77B00" : "#A74383" }),
          }}
        />
      );
    });
  } else if (choice.allyOptions) {
    title = "Dynastic Marriage";
    description = "Choose a kingdom to form an alliance with. Both gain +3 Victory Points and cannot attack each other.";
    confirmLabel = "Form Alliance";

    chips = choice.allyOptions.map((id) => {
      const player = props.G.playerInfo[id];
      return (
        <Chip
          key={id}
          label={player.kingdomName}
          onClick={() => setSelected(id)}
          variant={selected === id ? "filled" : "outlined"}
          color={selected === id ? "primary" : "default"}
          sx={{
            cursor: "pointer",
            fontSize: "14px",
            padding: "4px",
            backgroundColor: selected === id ? player.colour : undefined,
            color: selected === id ? "white" : undefined,
          }}
        />
      );
    });
  } else if (choice.colonyOptions) {
    title = "Colonial Rebellion";
    description = "Colonists are rising up! Choose which colony faces the rebellion:";
    confirmLabel = "Choose Colony";

    chips = choice.colonyOptions.map(([x, y]) => {
      const land = props.G.mapState.currentTileArray[y][x];
      const isSelected = isColonySelection(selected) && selected[0] === x && selected[1] === y;
      return (
        <Chip
          key={`${x},${y}`}
          label={land.name}
          onClick={() => setSelected([x, y])}
          variant={isSelected ? "filled" : "outlined"}
          color={isSelected ? "warning" : "default"}
          sx={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
        />
      );
    });
  } else {
    return null;
  }

  return (
    <ChipChoice
      title={title}
      description={description}
      chips={chips}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      confirmDisabled={!selected}
      onConfirm={resolve}
    />
  );
};

export default EventChoiceDialog;
