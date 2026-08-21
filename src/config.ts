import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Env var ${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

export const config = {
  telegram: {
    botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  },
  api: {
    secretKey: requireEnv("API_SECRET_KEY"),
    port: optionalNumber("PORT", 3000),
  },
  thaler: {
    baseUrl: requireEnv("THALER_API_BASE_URL"),
    apiKey: requireEnv("THALER_API_KEY"),
    walletAddress: requireEnv("THALER_WALLET_ADDRESS"),
    pollIntervalMs: optionalNumber("THALER_POLL_INTERVAL_MS", 5 * 60 * 1000),
    portfolioIntervalMs: optionalNumber("THALER_PORTFOLIO_INTERVAL_MS", 60 * 60 * 1000),
  },
  storage: {
    dbPath: process.env.DB_PATH ?? "./data/users.db",
  },
};
