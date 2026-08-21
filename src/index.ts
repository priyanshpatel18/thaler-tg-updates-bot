import { config } from "./config.js";
import { logger } from "./logger.js";
import { startTelegramBot } from "./telegramBot.js";
import { startVaultWatcher } from "./vaultWatcher.js";
import { startPortfolioSummary } from "./portfolioSummary.js";
import { createServer } from "./server.js";

function main(): void {
  logger.info("Starting...");

  startTelegramBot();
  logger.info("Telegram /start listener running");

  startVaultWatcher();
  logger.info("Vault watcher running");

  startPortfolioSummary();
  logger.info("Portfolio summary running");

  const app = createServer();
  app.listen(config.api.port, "0.0.0.0", () => {
    logger.info(`Admin API listening on port ${config.api.port}`);
  });
}

main();
