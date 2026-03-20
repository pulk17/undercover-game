import * as Sentry from '@sentry/node';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  roomCode?: string;
  playerId?: string;
  phase?: string;
  event?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, {
        level: 'warning',
        contexts: { custom: context },
      });
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, context), error);
    if (process.env.SENTRY_DSN) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          contexts: { custom: { ...context, message } },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          contexts: { custom: { ...context, error } },
        });
      }
    }
  }
}

export const logger = new Logger();
