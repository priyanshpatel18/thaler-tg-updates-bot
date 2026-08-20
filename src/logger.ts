import winston from "winston";

const { combine, timestamp, errors, printf, colorize } = winston.format;

const thalerFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `[Thaler Vault] ${ts} ${level}: ${stack ?? message}`;
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
