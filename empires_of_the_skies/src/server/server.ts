import { Server, Origins, SocketIO } from "boardgame.io/server";
import { MyGame } from "../Game";
const ServerComp = Server({
  games: [MyGame],
  origins: [
    Origins.LOCALHOST,
    Origins.LOCALHOST_IN_DEVELOPMENT,
    "https://empires-of-the-skies-53az.vercel.app/",
    "http://192.168.1.104:3000",
  ],
  transport: new SocketIO(),
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;

ServerComp.run(PORT, () => {
  console.log(`Process running on port: ${PORT}`);
});
ServerComp.router.allowedMethods;
