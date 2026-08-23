// packages/cli/src/utils/logger.ts
import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlationId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
}

function writeLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry);
  switch (entry.level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export class Logger {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || randomUUID();
  }

  private log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: msg,
      context: {
        correlationId: this.correlationId,
        ...context,
      },
    };
    writeLog(entry);
  }

  info(msg: string, context?: Record<string, unknown>): void {
    this.log('info', msg, context);
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    this.log('warn', msg, context);
  }

  error(msg: string, context?: Record<string, unknown>): void {
    this.log('error', msg, context);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    this.log('debug', msg, context);
  }

  child(additionalContext: Record<string, unknown>): Logger {
    const child = new Logger(this.correlationId);
    return child;
  }
}

// Default logger instance
export const logger = new Logger();

