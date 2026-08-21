import { config } from "./config.js";
import { logger } from "./logger.js";
import { recordUser } from "./db.js";
import { answerCallbackQuery, sendDirectMessage, setMyCommands, type InlineKeyboard } from "./telegram.js";
import { getWalletVaults } from "./thalerApi.js";
import { capitalize, equitySol, formatVaultBlock, isActiveVault, shortAddress } from "./vaultFormat.js";
import { buildPortfolioSummaryMessage } from "./portfolioSummary.js";

const COMMANDS = [
  { command: "start", description: "register for updates" },
  { command: "vaults", description: "list active vaults and view one" },
  { command: "portfolio", description: "get the portfolio summary now" },
  { command: "help", description: "show this list" },
];

const HELP_TEXT = ["Available commands:", ...COMMANDS.map((c) => `/${c.command} - ${c.description}`)].join("\n");

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
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
  url.searchParams.set("allowed_updates", JSON.stringify(["message", "callback_query"]));

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

  await sendDirectMessage(chatId, `Welcome to Thaler Vault Updates\n\n${HELP_TEXT}`);
}

async function handleVaultsCommand(chatId: string): Promise<void> {
  const response = await getWalletVaults(config.thaler.walletAddress);
  const active = response.vaults.filter(isActiveVault);

  if (active.length === 0) {
    await sendDirectMessage(chatId, "No active vaults.");
    return;
  }

  const keyboard: InlineKeyboard = {
    inline_keyboard: active.map((vault) => [
      {
        text: `${shortAddress(vault.execution.walletAddress)} — ${equitySol(vault).toFixed(2)} SOL (${capitalize(vault.execution.tier)})`,
        callback_data: `vault:${vault.execution.id}`,
      },
    ]),
  };

  await sendDirectMessage(chatId, "Select a vault:", keyboard);
}

async function handleHelpCommand(chatId: string): Promise<void> {
  await sendDirectMessage(chatId, HELP_TEXT);
}

async function handlePortfolioCommand(chatId: string): Promise<void> {
  await sendDirectMessage(chatId, await buildPortfolioSummaryMessage());
}

async function handleVaultCallback(chatId: string, callbackQueryId: string, vaultId: string): Promise<void> {
  const response = await getWalletVaults(config.thaler.walletAddress);
  const vault = response.vaults.find((v) => v.execution.id === vaultId);

  await answerCallbackQuery(callbackQueryId);

  if (!vault) {
    await sendDirectMessage(chatId, "Vault not found — it may have changed since the list was shown.");
    return;
  }

  await sendDirectMessage(chatId, formatVaultBlock(vault));
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

      if (update.callback_query) {
        const data = update.callback_query.data ?? "";
        const chatId = update.callback_query.message?.chat.id;
        if (chatId !== undefined && data.startsWith("vault:")) {
          const vaultId = data.slice("vault:".length);
          try {
            await handleVaultCallback(String(chatId), update.callback_query.id, vaultId);
          } catch (err) {
            logger.error("Failed to handle vault callback", { err, chatId, vaultId });
          }
        }
        continue;
      }

      const text = update.message?.text;
      if (!text) continue;

      const chatId = String(update.message!.chat.id);

      if (text.startsWith("/start")) {
        const userId = String(update.message!.from?.id ?? update.message!.chat.id);
        const username = update.message!.from?.username ?? null;
        const firstName = update.message!.from?.first_name ?? null;

        try {
          await handleStart(chatId, userId, username, firstName);
        } catch (err) {
          logger.error("Failed to handle /start", { err, chatId });
        }
      } else if (text.startsWith("/vaults")) {
        try {
          await handleVaultsCommand(chatId);
        } catch (err) {
          logger.error("Failed to handle /vaults", { err, chatId });
        }
      } else if (text.startsWith("/portfolio")) {
        try {
          await handlePortfolioCommand(chatId);
        } catch (err) {
          logger.error("Failed to handle /portfolio", { err, chatId });
        }
      } else if (text.startsWith("/help")) {
        try {
          await handleHelpCommand(chatId);
        } catch (err) {
          logger.error("Failed to handle /help", { err, chatId });
        }
      }
    }
  }
}

export function startTelegramBot(): void {
  setMyCommands(COMMANDS).catch((err) => logger.error("Failed to register bot commands", { err }));
  pollLoop().catch((err) => logger.error("Telegram poll loop crashed", { err }));
}
