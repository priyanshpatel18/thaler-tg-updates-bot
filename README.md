# Thaler Vault Bot

A small Telegram bot with seven jobs:

1. When someone sends `/start`, register them and reply with a welcome message and the command list.
2. Save their Telegram chat id and user id to a local SQLite DB.
3. Let an admin view that list through a secured API endpoint.
4. Poll one wallet's vaults on the Thaler API every `THALER_POLL_INTERVAL_MS`. When a vault's lifecycle changes (open/close/claim/dismantle, position status, or funds becoming claimable), ping every registered user with that vault's full data.
5. Push a portfolio summary (SOL price, TVL, total uPnL, realized profit, ROI, average LTV) to every registered user every `THALER_PORTFOLIO_INTERVAL_MS`.
6. Let any registered user send `/vaults` to get a list of active vaults (risk tier and SOL managed) and tap one to see its full data on demand, or `/portfolio` to get the portfolio summary instantly.
7. Let any registered user send `/help` to see the full command list.

## Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`, and copy the token it gives you. That's `TELEGRAM_BOT_TOKEN`.
2. Generate a random secret, for example `openssl rand -hex 32`. That's `API_SECRET_KEY`.
3. Get a Thaler API key (`THALER_API_KEY`) and pick the wallet address to watch (`THALER_WALLET_ADDRESS`).
4. Copy `.env.example` to `.env` and fill in the values.

## Commands to run

```bash
npm install
npm run dev
npm run build
npm start
```

`npm install` also sets up two git hooks:
- `pre-commit` runs a type check.
- `pre-push` runs a full build.

Both live in `.husky/` and are already in the repo.

## Checking who's registered

Every `/start` gets logged, so you can just read the Railway logs.

Or call the API:

```bash
curl -H "Authorization: Bearer $API_SECRET_KEY" https://your-service.up.railway.app/users
```

Or open it in a browser:

```
https://your-service.up.railway.app/users?key=YOUR_API_SECRET_KEY
```

## Deploying on Railway

1. Push this repo to a private GitHub repo.
2. In Railway, create a project from that repo.
3. Attach a volume and set `DB_PATH` to a file inside it, for example `/data/users.db`. Without this the user list gets wiped on every redeploy.
4. Add the env vars from `.env.example` in Railway's Variables tab. Don't set `PORT` yourself, Railway sets it.
5. Deploy and check the logs for `[Thaler Vault] Starting...`.

## Files

- `src/db.ts`, the SQLite tables (users, vault snapshots) and read/write functions.
- `src/telegramBot.ts`, listens for `/start` and `/vaults`, and handles the vault-picker button taps.
- `src/telegram.ts`, sends messages (with optional inline keyboards) and answers callback queries.
- `src/server.ts`, the admin API.
- `src/thalerApi.ts`, calls the Thaler wallet-vaults endpoint.
- `src/solPrice.ts`, reads the live SOL price from a MagicBlock account.
- `src/vaultFormat.ts`, shared formatting for a single vault's data readout.
- `src/vaultWatcher.ts`, polls the wallet's vaults and pings users on lifecycle changes.
- `src/portfolioSummary.ts`, pushes the portfolio summary on a schedule.
- `src/notify.ts`, sends a message to every registered user.
- `src/config.ts`, env vars.
- `src/logger.ts`, logging.
- `src/index.ts`, starts everything.
