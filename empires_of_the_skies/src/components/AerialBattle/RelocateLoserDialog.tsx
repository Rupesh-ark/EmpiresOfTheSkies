import { useEffect } from "react";
import { MyGameProps } from "@eots/game";
import { useMapSelection } from "@/contexts/MapSelectionContext";

/**
 * Relocate-loser step — the battle winner picks an empty tile to send the
 * defeated fleet to. Headless: instead of a dialog with an embedded map, it
 * drives the main map's selection mode (highlighted tiles + banner).
 */
const RelocateLoserDialog = (props: MyGameProps) => {
  const { startSelection, clearSelection } = useMapSelection();

  let victor = "";
  let loser = "";
  if (props.G.battleState) {
    Object.values(props.G.battleState).forEach((battler) => {
      if (battler.victorious === true) victor = battler.id;
      else loser = battler.id;
    });
  }

  const shouldPick =
    props.playerID === props.ctx.currentPlayer &&
    (props.playerID === victor ||
      (props.playerID === props.G.battleState?.attacker.id &&
        props.G.battleState?.defender.decision === "evade"));

  const tilesKey = JSON.stringify(props.G.validRelocationTiles ?? []);
  const loserName = props.G.playerInfo[loser]?.kingdomName ?? "the defeated fleet";
  const { moves } = props;

  useEffect(() => {
    if (!shouldPick) return;
    const tiles = props.G.validRelocationTiles ?? [];
    startSelection({
      tiles,
      prompt: `Choose an empty tile on the map to send ${loserName}'s defeated fleet to`,
      confirmLabel: "Relocate",
      onConfirm: (coords) => moves.relocateDefeatedFleet(coords, loser),
    });
    return () => clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPick, tilesKey, loser]);

  return null;
};

export default RelocateLoserDialog;
