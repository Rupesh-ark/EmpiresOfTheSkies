import { Server } from 'boardgame.io/server'
import { MyGame } from "../../src/Game";

const server = Server({
  games: [MyGame],
  origins: ['http://localhost:5173'],
})

const PORT = Number(process.env.PORT) || 8000

server.run(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})