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
  }
}
