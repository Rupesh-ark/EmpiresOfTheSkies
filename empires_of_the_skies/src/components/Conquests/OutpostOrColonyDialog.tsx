import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";
import WorldMap from "../WorldMap/WorldMap";

const OutpostOrColonyDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    props.ctx.phase === "conquest" &&
    inCurrentBattle &&
    props.G.conquestState === undefined &&
    props.G.stage === "conquest";

  return (
    <DialogShell
      open={isOpen}
      title="Choose your battle action"
      subtitle={`Would you like to establish an outpost or battle with the local inhabitants to create a colony? If you lose and already have an outpost, it will be lost along with any garrisoned troops who cannot fit aboard your remaining skyships. Current map tile: [${1 + x}, ${4 - y}]`}
      mood="discovery"
      size="lg"
      confirmLabel="Colony"
      confirmColor="success"
      onConfirm={() => props.moves.coloniseLand()}
      cancelLabel="Pass"
      cancelColor="error"
      onCancel={() => props.moves.doNothing()}
      extraActions={
        <GameButton variant="primary" onClick={() => props.moves.constructOutpost()}>
          Outpost
        </GameButton>
      }
    >
      <WorldMap {...props} selectableTiles={[props.G.mapState.currentBattle]} />
    </DialogShell>
  );
};

export default OutpostOrColonyDialog;
