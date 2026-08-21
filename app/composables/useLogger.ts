/**
 * Logger conditionnel - actif seulement en dev
 * Remplace les console.log bruts pour éviter pollution en production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.dev;

function formatMessage(level: LogLevel, args: unknown[]): unknown[] {
  const prefix = `[${level.toUpperCase()}] ${new Date().toISOString()}`;
  return [prefix, ...args];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...formatMessage("debug", args));
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(...formatMessage("info", args));
    }
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(...formatMessage("warn", args));
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(...formatMessage("error", args));
  },
};

export const useLogger = () => logger;
