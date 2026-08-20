import { config } from "./config.js";
import { logger } from "./logger.js";
import { recordUser } from "./db.js";
import { sendDirectMessage } from "./telegram.js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
}

interface GetUpdatesResponse {
  ok: boolean;
  result: TelegramUpdate[];
}

let offset = 0;

async function getUpdates(): Promise<TelegramUpdate[]> {
  const url = new URL(`https://api.telegram.org/bot${config.telegram.botToken}/getUpdates`);
  url.searchParams.set("timeout", "30");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("allowed_updates", JSON.stringify(["message"]));

  const res = await fetch(url, { signal: AbortSignal.timeout(35_000) });
  if (!res.ok) {
    throw new Error(`getUpdates failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as GetUpdatesResponse;
  return body.result;
}

async function handleStart(chatId: string, userId: string, username: string | null, firstName: string | null) {
  const user = recordUser(chatId, userId, username, firstName);
  logger.info(`New /start — chatId=${user.chatId} userId=${user.userId} username=${user.username ?? "-"}`);

  await sendDirectMessage(chatId, "Welcome to Thaler Vault Updates");
}

async function pollLoop(): Promise<void> {
  for (;;) {
    let updates: TelegramUpdate[];
    try {
      updates = await getUpdates();
    } catch (err) {
      logger.error("Telegram getUpdates failed", { err });
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;

      const text = update.message?.text;
      if (!text?.startsWith("/start")) continue;

      const chatId = String(update.message!.chat.id);
      const userId = String(update.message!.from?.id ?? update.message!.chat.id);
      const username = update.message!.from?.username ?? null;
      const firstName = update.message!.from?.first_name ?? null;

      try {
        await handleStart(chatId, userId, username, firstName);
      } catch (err) {
        logger.error("Failed to handle /start", { err, chatId });
      }
    }
  }
}

export function startTelegramBot(): void {
  pollLoop().catch((err) => logger.error("Telegram poll loop crashed", { err }));
}
