import winston from "winston";

const { combine, timestamp, errors, printf, colorize } = winston.format;

function serializeMeta(meta: Record<string, unknown>): string {
  return JSON.stringify(meta, (_key, value) =>
    value instanceof Error ? { message: value.message, stack: value.stack } : value
  );
}

const thalerFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let line = `[Thaler Vault] ${ts} ${level}: ${stack ?? message}`;

  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    line += ` ${serializeMeta(meta as Record<string, unknown>)}`;
  }

  return line;
});

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    ...(isProduction ? [] : [colorize()]),
    thalerFormat
  ),
  transports: [new winston.transports.Console()],
});
