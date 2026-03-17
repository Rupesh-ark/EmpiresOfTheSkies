type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  mod: string;
  msg: string;
  data?: Record<string, unknown>;
}

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
  };
  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
    info:  (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
    warn:  (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
  };
};
