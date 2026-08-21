import { config } from "./config.js";

export interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
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

/** Dismisses the loading spinner on an inline keyboard button after it's been handled. */
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
