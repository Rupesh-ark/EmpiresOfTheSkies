import { useState } from "react";
import { MyGameProps } from "@eots/game";
import FleetDisplay from "../PlayerBoard/FleetDisplay";
import WorldMap from "../WorldMap/WorldMap";
import { DialogShell } from "@/components/atoms/DialogShell";
import { getLocationPresentation } from "@/utils/locationLabels";

const RetrieveFleetsDialog = (props: MyGameProps) => {
  const [selectedFleets, setSelectedFleets] = useState<number[]>([]);

  const player = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const deployedFleets = player?.fleetInfo.filter(
    (f) => f.location[0] !== 4 || f.location[1] !== 0
  ) ?? [];

  const toggleFleet = (fleetId: number) => {
    setSelectedFleets((prev) =>
      prev.includes(fleetId)
        ? prev.filter((id) => id !== fleetId)
        : [...prev, fleetId]
    );
  };

  const isOpen =
    props.ctx.phase === "resolution" &&
    props.G.stage === "retrieve fleets" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <DialogShell
      open={isOpen}
      title="Do you want to retrieve any fleets?"
      subtitle="Bring home any of your dispatched fleets for free, allowing you to restock them with skyships and troops."
      mood="peacetime"
      size="lg"
      confirmLabel="Retrieve fleets"
      confirmColor="success"
      onConfirm={() => props.moves.retrieveFleets(selectedFleets)}
      cancelLabel="Skip"
      cancelColor="error"
      onCancel={() => props.moves.retrieveFleets([])}
    >
      {deployedFleets.map((fleet) => {
        const loc = getLocationPresentation(
          props.G.mapState.currentTileArray,
          fleet.location
        );
        return (
          <FleetDisplay
            key={fleet.fleetId}
            fleetId={fleet.fleetId}
            location={fleet.location}
            locationLabel={loc.name}
            locationReference={loc.reference}
            skyships={fleet.skyships}
            regiments={fleet.regiments}
            levies={fleet.levies}
            selected={selectedFleets.includes(fleet.fleetId) ? fleet.fleetId : -1}
            onClickFunction={() => toggleFleet(fleet.fleetId)}
          />
        );
      })}
      <WorldMap {...props} />
    </DialogShell>
  );
};

export default RetrieveFleetsDialog;
