import { config } from "./config.js";
import { logger } from "./logger.js";
import { notifyAll } from "./notify.js";
import { getSolPriceUsd } from "./solPrice.js";
import { equitySol, isActiveVault, realizedProfitSol as vaultRealizedProfitSol } from "./vaultFormat.js";
import { getWalletVaults, type Vault } from "./thalerApi.js";

interface PortfolioAggregate {
  activeCount: number;
  tvlSol: number;
  realizedProfitSol: number;
  avgLtvPct: number;
  roiPct: number;
}

export function computeAggregate(vaults: Vault[]): PortfolioAggregate {
  const active = vaults.filter(isActiveVault);

  let tvlSol = 0;
  let realizedProfitSol = 0;
  let ltvBpsSum = 0;
  let ltvCount = 0;

  for (const vault of active) {
    const kaminoMultiply = vault.state?.positions?.positions.kaminoMultiply;

    tvlSol += equitySol(vault);
    realizedProfitSol += vaultRealizedProfitSol(vault);

    if (kaminoMultiply) {
      ltvBpsSum += kaminoMultiply.ltvBps;
      ltvCount += 1;
    }
  }

  return {
    activeCount: active.length,
    tvlSol,
    realizedProfitSol,
    avgLtvPct: ltvCount > 0 ? ltvBpsSum / ltvCount / 100 : 0,
    roiPct: tvlSol > 0 ? (realizedProfitSol / tvlSol) * 100 : 0,
  };
}

function formatSummary(agg: PortfolioAggregate, solPriceUsd: number): string {
  return [
    `*Portfolio Summary* (${agg.activeCount} active vaults)`,
    ``,
    `SOL Price: $${solPriceUsd.toFixed(2)}`,
    `TVL: ${agg.tvlSol.toFixed(4)} SOL`,
    `Realized Profit (since last claim): ${agg.realizedProfitSol.toFixed(4)} SOL`,
    `ROI (since last claim): ${agg.roiPct.toFixed(2)}%`,
    `Avg LTV: ${agg.avgLtvPct.toFixed(2)}%`,
  ].join("\n");
}

export async function buildPortfolioSummaryMessage(): Promise<string> {
  const [response, solPriceUsd] = await Promise.all([getWalletVaults(config.thaler.walletAddress), getSolPriceUsd()]);
  const aggregate = computeAggregate(response.vaults);
  return formatSummary(aggregate, solPriceUsd);
}

async function tick(): Promise<void> {
  await notifyAll(await buildPortfolioSummaryMessage());
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
