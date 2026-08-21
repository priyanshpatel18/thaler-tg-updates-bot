import { config } from "./config.js";
import { logger } from "./logger.js";
import { notifyAll } from "./notify.js";
import { getSolPriceUsd } from "./solPrice.js";
import { equitySol, isActiveVault } from "./vaultFormat.js";
import { getWalletVaults, type Vault } from "./thalerApi.js";

interface PortfolioAggregate {
  activeCount: number;
  tvlSol: number;
  totalUPnlUsd: number;
  realizedProfitSol: number;
  avgLtvPct: number;
  roiPct: number;
}

function computeAggregate(vaults: Vault[]): PortfolioAggregate {
  const active = vaults.filter(isActiveVault);

  let tvlSol = 0;
  let totalUPnlUsd = 0;
  let realizedProfitSol = 0;
  let ltvBpsSum = 0;
  let ltvCount = 0;

  for (const vault of active) {
    const fast = vault.state?.fast;
    const positionsState = vault.state?.positions;
    const kaminoMultiply = positionsState?.positions.kaminoMultiply;

    tvlSol += equitySol(vault);
    totalUPnlUsd += fast?.unrealizedPnlUsd ?? 0;
    realizedProfitSol += Number(positionsState?.realizedYieldLamports ?? 0) / 1e9;

    if (kaminoMultiply) {
      ltvBpsSum += kaminoMultiply.ltvBps;
      ltvCount += 1;
    }
  }

  return {
    activeCount: active.length,
    tvlSol,
    totalUPnlUsd,
    realizedProfitSol,
    avgLtvPct: ltvCount > 0 ? ltvBpsSum / ltvCount / 100 : 0,
    // Vaults are delta-neutral, so uPnL is basis noise, not return. ROI is realized profit only.
    roiPct: tvlSol > 0 ? (realizedProfitSol / tvlSol) * 100 : 0,
  };
}

function formatSummary(agg: PortfolioAggregate, solPriceUsd: number): string {
  return [
    `*Portfolio Summary* (${agg.activeCount} active vaults)`,
    ``,
    `SOL Price: $${solPriceUsd.toFixed(2)}`,
    `TVL: ${agg.tvlSol.toFixed(4)} SOL`,
    `Total uPnL: $${agg.totalUPnlUsd.toFixed(2)}`,
    `Realized Profit: ${agg.realizedProfitSol.toFixed(4)} SOL`,
    `ROI: ${agg.roiPct.toFixed(2)}%`,
    `Avg LTV: ${agg.avgLtvPct.toFixed(2)}%`,
  ].join("\n");
}

async function tick(): Promise<void> {
  const [response, solPriceUsd] = await Promise.all([getWalletVaults(config.thaler.walletAddress), getSolPriceUsd()]);
  const aggregate = computeAggregate(response.vaults);
  await notifyAll(formatSummary(aggregate, solPriceUsd));
}

export function startPortfolioSummary(): void {
  async function loop(): Promise<void> {
    for (;;) {
      try {
        await tick();
      } catch (err) {
        logger.error("Portfolio summary tick failed", { err });
      }
      await new Promise((resolve) => setTimeout(resolve, config.thaler.portfolioIntervalMs));
    }
  }

  loop().catch((err) => logger.error("Portfolio summary loop crashed", { err }));
}
