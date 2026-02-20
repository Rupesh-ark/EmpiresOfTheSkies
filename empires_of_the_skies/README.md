# Boardgame.io + Vite + React Template

This is a template for creating multiplayer board games using [boardgame.io](https://boardgame.io/), React, and Vite.

## Features

- TypeScript support
- React for UI components
- Vite for fast development
- Multiplayer support with Socket.IO
- Clean, modern UI
- Match creation and joining system
- Debug panel included

## Getting Started

You can create a new project based on this template using degit:

```bash
npx degit sayginburak/vite-template-boardgame-io my-game
cd my-game
npm install
```

Then:

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Start the game server (in a separate terminal):
   ```bash
   npm run server
   ```

## Playing the Game

1. Open http://localhost:5173 in two browser windows
2. In the first window:
   - Click "Create New Game"
   - Copy the Match ID that appears
3. In the second window:
   - Paste the Match ID
   - Click "Join Game"
4. Play the game!


## Customizing the Game

1. Modify `src/game/SimpleGame.ts` to change game rules and logic
2. Update `src/components/Game.tsx` to customize the game board
3. Adjust styles in `src/App.css`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run server` - Start the game server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Notes

- The game server runs on port 8000
- The development server runs on port 5173
- Debug panel is enabled by default (can be disabled in App.tsx)
- TypeScript is configured for strict mode

## License

MIT