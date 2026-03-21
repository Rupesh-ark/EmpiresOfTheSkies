import { useState } from "react";
import { Chip, Typography } from "@mui/material";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const EventChoiceDialog = (props: MyGameProps) => {
  const [selected, setSelected] = useState<any>(undefined);

  const choice = props.G.eventState.pendingChoice;
  if (!choice) return null;
  if (choice.targetPlayerID !== props.playerID) return null;

  const def = EVENT_CARD_DEFS[choice.card];

  if (choice.buildingOptions) {
    return (
      <DialogShell open title="The Great Fire" mood="crisis" size="sm" hideActions>
        <Typography variant="body2" sx={{ mb: 2 }}>
          A fire destroys one of your grand buildings. Choose which to lose:
        </Typography>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {choice.buildingOptions.map((type) => (
            <Chip
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              onClick={() => setSelected(type)}
              variant={selected === type ? "filled" : "outlined"}
              color={selected === type ? "error" : "default"}
              sx={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <GameButton
            variant="danger"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Lose Building
          </GameButton>
        </div>
      </DialogShell>
    );
  }

  if (choice.legacyOptions) {
    return (
      <DialogShell open title="Royal Succession" mood="crisis" size="sm" hideActions>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Your legacy card has been scored. Choose a new one:
        </Typography>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {choice.legacyOptions.map((card) => {
            const isSelected =
              selected?.name === card.name && selected?.colour === card.colour;
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
                  ...(isSelected
                    ? {}
                    : { color: card.colour === "orange" ? "#E77B00" : "#A74383" }),
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <GameButton
            variant="primary"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Choose Card
          </GameButton>
        </div>
      </DialogShell>
    );
  }

  if (choice.allyOptions) {
    return (
      <DialogShell open title="Dynastic Marriage" mood="crisis" size="sm" hideActions>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Choose a kingdom to form an alliance with. Both gain +3 VP and
          cannot attack each other.
        </Typography>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {choice.allyOptions.map((id) => {
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
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <GameButton
            variant="primary"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Form Alliance
          </GameButton>
        </div>
      </DialogShell>
    );
  }

  if (choice.colonyOptions) {
    return (
      <DialogShell open title="Colonial Rebellion" mood="crisis" size="sm" hideActions>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Colonists are rising up! Choose which colony faces the rebellion:
        </Typography>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {choice.colonyOptions.map(([x, y]) => {
            const land = props.G.mapState.currentTileArray[y][x];
            const isSelected = selected && selected[0] === x && selected[1] === y;
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
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <GameButton
            variant="primary"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Choose Colony
          </GameButton>
        </div>
      </DialogShell>
    );
  }

  if (choice.binaryOptions) {
    const formatLabel = (opt: string): string => {
      if (opt.startsWith("pay_gold:")) return `Pay ${opt.split(":")[1]} Gold`;
      if (opt === "sell_factory") return "Sell One Factory (gain 3 gold)";
      if (opt === "lose_cathedral") return "Lose One Cathedral (gain 3 gold)";
      if (opt === "lose_vp") return "Lose 3 VP";
      return opt;
    };

    return (
      <DialogShell open title={def.displayName} mood="crisis" size="sm" hideActions>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {def.description}
        </Typography>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {choice.binaryOptions.map((opt) => (
            <GameButton
              key={opt}
              variant="danger"
              onClick={() => props.moves.resolveEventChoice(opt)}
            >
              {formatLabel(opt)}
            </GameButton>
          ))}
        </div>
      </DialogShell>
    );
  }

  return null;
};

export default EventChoiceDialog;
