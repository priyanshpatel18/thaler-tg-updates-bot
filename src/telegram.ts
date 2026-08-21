import { config } from "./config.js";

export interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
}

export interface BotCommand {
  command: string;
  description: string;
}

export async function sendDirectMessage(chatId: string, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram sendMessage to ${chatId} failed: ${res.status} ${errBody}`);
  }
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/answerCallbackQuery`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram answerCallbackQuery failed: ${res.status} ${errBody}`);
  }
}

export async function setMyCommands(commands: BotCommand[]): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/setMyCommands`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram setMyCommands failed: ${res.status} ${errBody}`);
  }
}
