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
    // Required on every admin request to the HTTP API (Authorization: Bearer <secretKey>, or ?key=).
    secretKey: requireEnv("API_SECRET_KEY"),
    port: optionalNumber("PORT", 3000),
  },
  storage: {
    dbPath: process.env.DB_PATH ?? "./data/users.db",
  },
};
