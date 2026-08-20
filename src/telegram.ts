import { config } from "./config.js";

/** Sends a message to one specific chat via the Telegram Bot API. */
export async function sendDirectMessage(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram sendMessage to ${chatId} failed: ${res.status} ${errBody}`);
  }
}
