// End-to-end smoke: EotS game + boardgame.io client + error channel.
// A move rejected by server-side validate must surface its MoveError
// on client.lastActionError / subscribe's second argument.
import { Client } from "boardgame.io/client";
import { MyGame } from "./src/Game";

const client = Client({ game: MyGame, numPlayers: 3, playerID: "2" });
client.start();

let subscribedError = null;
client.subscribe((_state, error) => {
  if (error) subscribedError = error;
});

// recruitCounsellors with an absurd count — validator must reject it.
client.moves.pickKingdomAdvantageCard("no-such-card");

const err = client.lastActionError;
console.log("lastActionError:", JSON.stringify(err));
console.log("subscribe arg :", JSON.stringify(subscribedError));

if (!err || !err.payload?.message) {
  console.error("FAIL: no error payload reached the client");
  process.exit(1);
}
if (!subscribedError) {
  console.error("FAIL: subscribe callback never saw the error");
  process.exit(1);
}
console.log("PASS: rejection reason delivered end-to-end");
client.stop();
