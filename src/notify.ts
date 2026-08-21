import { logger } from "./logger.js";
import { listUsers } from "./db.js";
import { sendDirectMessage } from "./telegram.js";

export async function notifyAll(text: string): Promise<void> {
  const users = listUsers();
  for (const user of users) {
    try {
      await sendDirectMessage(user.chatId, text);
    } catch (err) {
      logger.error("Failed to send message", { err, chatId: user.chatId });
    }
  }
}
