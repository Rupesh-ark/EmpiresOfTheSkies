import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // boardgame.io is CJS; tell Vite to pre-bundle it so ESM tests can import it
    server: {
      deps: {
        inline: ["boardgame.io"],
      },
    },
  },
});