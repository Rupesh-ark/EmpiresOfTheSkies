import { MyGameProps } from "@eots/game";
import PlayerTable from "./PlayerTable/PlayerTable";
import { DialogShell } from "@/components/atoms/DialogShell";

const GameOverView = (props: MyGameProps) => {
  const open = props.ctx.gameover ?? false;
  return (
    <DialogShell open={open} title="Game Over!" mood="peacetime" size="lg" hideActions>
      <PlayerTable {...props} />
    </DialogShell>
  );
};

export default GameOverView;
