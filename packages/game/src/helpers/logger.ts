type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  mod: string;
  msg: string;
  data?: Record<string, unknown>;
}

let logFilePath: string | null = null;

function getLogFilePath(): string | null {
  if (logFilePath !== null) return logFilePath;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    logFilePath = path.resolve(process.cwd(), 'server/logs/game.log');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  } catch {
    logFilePath = null;
  }
  return logFilePath;
}

function writeToFile(entry: LogEntry): void {
  try {
    const filePath = getLogFilePath();
    if (!filePath) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');

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

let traceFilePath: string | null = null;

function getTraceFilePath(): string {
  if (traceFilePath === null) {
    traceFilePath = '/tmp/selfplay_trace.log';
  }
  return traceFilePath;
}

export function logGameEvent(category: string, message: string, data?: Record<string, unknown>): void {
  try {
    const fs = require('fs') as typeof import('fs');
    const line = `[EVENT:${category}] ${message}` + (data ? ` ${JSON.stringify(data)}` : '');
    fs.appendFileSync(getTraceFilePath(), line + '\n');
  } catch {
  }
}

export const logBattleEvent = (attacker: string, defender: string, type: string, result?: string) => {
  logGameEvent('BATTLE', `${attacker} vs ${defender} (${type})`, result ? { result } : undefined);
};

export const logDiscoveryEvent = (player: string, tile: [number, number], race?: string) => {
  logGameEvent('DISCOVERY', `${player} discovered [${tile}]`, race ? { race } : undefined);
};

export const logConquestEvent = (player: string, tile: [number, number], action: string) => {
  logGameEvent('CONQUEST', `${player} ${action} at [${tile}]`);
};

export const logRebellionEvent = (target: string, event: string) => {
  logGameEvent('REBELLION', `${event}`, { target });
};

export const logInvasionEvent = (captainGeneral: string, phase: string) => {
  logGameEvent('INVASION', `Phase: ${phase}`, { captainGeneral });
};

export const logElectionEvent = (archprelate: string, results: Record<string, number>) => {
  logGameEvent('ELECTION', `${archprelate} elected`, { results });
};

export const logRoundEnd = (round: number, scores: Record<string, number>) => {
  logGameEvent('ROUND_END', `Round ${round} complete`, { scores });
};

export const logGameEnd = (winner: string, scores: Record<string, number>) => {
  logGameEvent('GAME_OVER', `${winner} wins!`, { scores });
};
