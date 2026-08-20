# Thaler Vault Bot

Minimal Telegram bot. It does exactly three things:

1. Runs a local SQLite DB (via Node's built-in `node:sqlite` module — no
   native/compiled dependency, requires Node 22.5+).
2. When someone sends `/start`, replies with `Welcome to Thaler Vault Updates`
   and saves their Telegram **chat id** and **user id** (plus username/first
   name, for context) into that DB.
3. Exposes an admin-only HTTP endpoint (via `express`), protected by a
   secret key, so you can see everyone who's registered — from a terminal,
   a browser, or just by reading it out of the Railway logs (every new
   registration is logged there too).

Nothing else. No price feed, no position tracking, no subscriptions, no
payments — those were previous iterations of this bot and have been
removed. This is the current, intentionally small scope.

## Why the two things it depends on

- **SQLite (built into Node, `node:sqlite`)** — the bot's memory of who's
  registered has to survive process restarts, so it can't live in a JS
  variable. SQLite is a single file holding one row per user. Originally
  this used the `better-sqlite3` package, but that requires compiling a
  native binary on install, which failed on Railway's build image (no
  prebuilt binary for the exact Node version, and no `node-gyp`/build
  toolchain available to compile from source). Switched to `node:sqlite` —
  ships with Node itself, nothing to install, nothing to compile.
- **`express`** — runs a small HTTP server alongside the Telegram listener
  so you (the admin) have a way to read that file's contents without
  needing to SSH into anything.

## Files

- `src/config.ts` — reads/validates env vars.
- `src/db.ts` — SQLite `users` table (chat id, user id, username, first
  name, timestamps) and the two functions that touch it: `recordUser`
  (called on every `/start`) and `listUsers` (called by the admin route).
- `src/telegram.ts` — `sendDirectMessage`, the one Telegram Bot API call
  this bot makes.
- `src/telegramBot.ts` — long-polls Telegram for `/start` messages, saves
  the sender, replies with the welcome message.
- `src/server.ts` — the admin API: `GET /health` (unauthenticated) and
  `GET /users` (requires the secret key).
- `src/logger.ts` — Winston logger, `[Thaler Vault]`-prefixed.
- `src/index.ts` — starts the Telegram listener and the admin server.

## Setup

1. **Create the bot**: message [@BotFather](https://t.me/BotFather) on
   Telegram, `/newbot`, follow the prompts. It gives you a token like
   `123456789:AA...` — that's `TELEGRAM_BOT_TOKEN`.
2. **Generate an API secret**: anything long and random, e.g.
   `openssl rand -hex 32` — that's `API_SECRET_KEY`.
3. Copy `.env.example` to `.env` and fill in both values.

## Commands you'll need to run yourself

Nothing has been installed yet.

```bash
npm install        # installs dependencies (dotenv, express, winston, typescript, tsx)
npm run dev          # run the bot locally (uses tsx, no build step; needs Node 22.5+ for node:sqlite)
npm run build        # compile TypeScript -> dist/ (used by Railway)
npm start            # run the compiled bot (node dist/index.js)
```

Once running locally, message your bot `/start` on Telegram — you should
get the welcome message back immediately, and see a log line like:
```
[Thaler Vault] ... info: New /start — chatId=1998267904 userId=1998267904 username=priyansh_ptl18
```

## Checking who's registered

Three ways, all showing the same data:

1. **Railway logs** — every `/start` logs the chat id + user id line shown
   above. No API call needed, just read the deploy logs.
2. **CLI**:
   ```bash
   curl -H "Authorization: Bearer $API_SECRET_KEY" https://your-service.up.railway.app/users
   ```
3. **Browser** — paste the key as a query param instead, since browsers
   can't easily set custom headers:
   ```
   https://your-service.up.railway.app/users?key=YOUR_API_SECRET_KEY
   ```

## Deploying on Railway

1. Push this repo to a **private** GitHub repo.
2. In Railway: New Project -> Deploy from GitHub repo -> pick it.
3. Railway auto-detects Node (via `railway.json` + `package.json`): it runs
   an install step, `npm run build`, then `npm start`. No native modules
   to compile anymore, so this should succeed regardless of whether
   Nixpacks picks `npm` or `bun` for the install step.
4. **Attach a volume** and mount it (e.g. at `/data`), then set `DB_PATH` to
   a file inside it (e.g. `/data/users.db`). Without this, the user list is
   wiped on every redeploy — Railway's default filesystem is ephemeral.
5. In the Railway service's **Variables** tab, add everything from
   `.env.example` (do not commit your real `.env`). Don't set `PORT`
   yourself — Railway injects it.
6. Deploy. Check the logs for `[Thaler Vault] Starting...` and
   `Admin API listening on port ...`.
7. Railway assigns a public domain to the service (Settings -> Networking
   -> Generate Domain if it hasn't already) — that's what you hit for the
   `/users` route from outside Railway.

## Tuning

- `LOG_LEVEL` — Winston log level: `error`, `warn`, `info` (default), `debug`.
- `DB_PATH` — where the SQLite file lives (default `./data/users.db`).
- `PORT` — admin API port (Railway sets this for you; defaults to 3000 locally).

## Caveat

The `API_SECRET_KEY` check is a plain string compare, not constant-time —
fine behind Railway's network for an admin-only tool, but don't expose this
as a high-value public target without hardening it further.
