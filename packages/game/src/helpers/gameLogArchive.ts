/**
 * gameLogArchive.ts
 *
 * Writes trimmed game-log entries to server/logs/gamelog.log.
 * Only runs on Node.js — silently no-ops in the browser.
 * Keeps a persistent narrative history of all game events for
 * post-game analysis, while G.gameLog stays bounded for WebSocket sync.
 */

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  !!process.versions.node;

let filePath: string | null = null;

function ensureFilePath(): string | null {
  if (filePath !== null) return filePath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    filePath = path.resolve(process.cwd(), "server/logs/gamelog.log");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  } catch {
    filePath = null;
  }
  return filePath;
}

export function archiveGameLogEntries(
  entries: { round: number; message: string }[]
): void {
  if (!isNode || entries.length === 0) return;
  try {
    const fp = ensureFilePath();
    if (!fp) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    const lines = entries.map((e) => `[R${e.round}] ${e.message}`).join("\n");
    fs.appendFileSync(fp, lines + "\n");
  } catch {
    // Never let file I/O crash the game
  }
}
