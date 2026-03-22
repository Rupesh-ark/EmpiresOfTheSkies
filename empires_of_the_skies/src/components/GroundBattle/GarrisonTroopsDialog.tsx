import { useState } from "react";
import { MyGameProps, createLogger } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { TroopSelector } from "@/components/atoms/TroopSelector";
import WorldMap from "../WorldMap/WorldMap";

const log = createLogger("battle");

const GarrisonTroopsDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  // Count troops available at this tile from player's fleets
  let playerRegiments = 0;
  let playerLevies = 0;
  props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]?.fleetInfo.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      playerRegiments += fleet.regiments;
      playerLevies += fleet.levies;
    }
  });

  const hasTroopsToGarrison = playerRegiments > 0 || playerLevies > 0;

  // Auto-skip if no troops to garrison
  if (
    props.G.stage === "garrison troops" &&
    props.ctx.currentPlayer === props.playerID &&
    !(
      props.ctx.phase === "ground_battle" &&
      inCurrentBattle &&
      props.G.battleState?.attacker.id === props.playerID &&
      props.G.battleState.attacker.victorious === true &&
      hasTroopsToGarrison
    ) &&
    !(props.ctx.phase === "conquest" && inCurrentBattle && hasTroopsToGarrison)
  ) {
    log.info("garrison dialog", { phase: props.ctx.phase });
    props.ctx.phase === "ground_battle"
      ? props.moves.doNotGroundAttack()
      : props.moves.doNothing();
  }

  const [regimentCount, setRegimentCount] = useState(
    props.G.mapState.buildings[y]?.[x]?.garrisonedRegiments ?? 0
  );
  const [levyCount, setLevyCount] = useState(
    props.G.mapState.buildings[y]?.[x]?.garrisonedLevies ?? 0
  );

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    props.G.stage === "garrison troops" &&
    ((props.ctx.phase === "ground_battle" &&
      inCurrentBattle &&
      props.G.battleState?.attacker.id === props.playerID &&
      props.G.battleState.attacker.victorious === true &&
      hasTroopsToGarrison) ||
      (props.ctx.phase === "conquest" &&
        inCurrentBattle &&
        hasTroopsToGarrison));

  return (
    <DialogShell
      open={isOpen}
      title="Who would you like to garrison?"
      subtitle="You can choose to garrison troops or leave the region undefended."
      mood="discovery"
      size="lg"
      confirmLabel="Garrison"
      confirmColor="success"
      onConfirm={() => props.moves.garrisonTroops([regimentCount, levyCount])}
      cancelLabel="Pass"
      cancelColor="error"
      onCancel={() => {
        props.ctx.phase === "ground_battle"
          ? props.moves.doNotGroundAttack()
          : props.moves.doNothing();
      }}
    >
      <TroopSelector
        label="Regiments"
        value={regimentCount}
        onChange={setRegimentCount}
        max={playerRegiments}
        sx={{ mb: 2 }}
      />
      <TroopSelector
        label="Levies"
        value={levyCount}
        onChange={setLevyCount}
        max={playerLevies}
        sx={{ mb: 2 }}
      />
      <WorldMap {...props} selectableTiles={[props.G.mapState.currentBattle]} />
    </DialogShell>
  );
};

export default GarrisonTroopsDialog;
