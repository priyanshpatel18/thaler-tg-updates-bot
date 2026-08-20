# Thaler Vault Bot

A small Telegram bot with three jobs:

1. When someone sends `/start`, reply with `Welcome to Thaler Vault Updates`.
2. Save their Telegram chat id and user id to a local SQLite DB.
3. Let an admin view that list through a secured API endpoint.

Nothing else. No price feed, no positions, no subscriptions, no payments.

## Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`, and copy the token it gives you. That's `TELEGRAM_BOT_TOKEN`.
2. Generate a random secret, for example `openssl rand -hex 32`. That's `API_SECRET_KEY`.
3. Copy `.env.example` to `.env` and fill in both values.

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

- `src/db.ts`, the SQLite table and read/write functions.
- `src/telegramBot.ts`, listens for `/start`.
- `src/telegram.ts`, sends messages.
- `src/server.ts`, the admin API.
- `src/config.ts`, env vars.
- `src/logger.ts`, logging.
- `src/index.ts`, starts everything.

## Note

The API key check is a plain string compare. Fine for an internal admin tool, not meant for public exposure.
