type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  mod: string;
  msg: string;
  data?: Record<string, unknown>;
}

// Lazily resolved log file path — only used on Node.js.
// We wrap the fs calls in try/catch so that any import failure (e.g. in a
// browser bundle that somehow reaches this branch) never crashes the app.
let _logFilePath: string | null = null;

function getLogFilePath(): string | null {
  if (_logFilePath !== null) return _logFilePath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    // __dirname is packages/game/src/helpers — walk up to repo root
    _logFilePath = path.resolve(__dirname, '../../../../server/logs/game.log');
    // Ensure the directory exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    fs.mkdirSync(path.dirname(_logFilePath), { recursive: true });
  } catch {
    _logFilePath = null;
  }
  return _logFilePath;
}

function writeToFile(entry: LogEntry): void {
  try {
    const filePath = getLogFilePath();
    if (!filePath) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');

    // Human-readable line: [timestamp] LEVEL [module] message
    let line = `[${entry.ts}] ${entry.level.toUpperCase().padEnd(5)} [${entry.mod}] ${entry.msg}`;

    if (entry.data !== undefined) {
      // On error level, include the full G object if present
      if (entry.level === 'error' && 'G' in entry.data) {
        line += ' ' + JSON.stringify(entry.data);
      } else if (entry.level === 'error') {
        line += ' ' + JSON.stringify(entry.data);
      } else {
        line += ' ' + JSON.stringify(entry.data);
      }
    }

    fs.appendFileSync(filePath, line + '\n');
  } catch {
    // Never let file I/O crash the game
  }
}

const isNode =
  typeof process !== 'undefined' && process.versions != null && !!process.versions.node;

export const createLogger = (mod: string) => {
  const emit = (level: LogLevel, msg: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      mod,
      msg,
      ...(data !== undefined && { data }),
    };
    const line = JSON.stringify(entry);
    switch (level) {
      case 'debug': console.debug(line); break;
      case 'warn':  console.warn(line);  break;
      case 'error': console.error(line); break;
      default:      console.log(line);   break;
    }

    if (isNode) {
      writeToFile(entry);
    }
  };
  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
    info:  (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
    warn:  (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
  };
};
