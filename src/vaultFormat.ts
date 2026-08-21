import type { Vault } from "./thalerApi.js";

export function isActiveVault(vault: Vault): boolean {
  return vault.positions[0]?.status === "OPEN";
}

export function shortId(vaultId: string): string {
  return vaultId.slice(0, 8);
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function netValueSol(vault: Vault): number {
  return Number(vault.quantSeriesLatest?.netValueSolLamports ?? 0) / 1e9;
}

export function equitySol(vault: Vault): number {
  return Number(vault.execution.equityLamports ?? 0) / 1e9;
}

export function realizedProfitSol(vault: Vault): number {
  return Number(vault.state?.positions?.realizedYieldLamports ?? 0) / 1e9;
}

export function roiPct(vault: Vault): number {
  const equity = equitySol(vault);
  return equity > 0 ? (realizedProfitSol(vault) / equity) * 100 : 0;
}

export function daysHeld(vault: Vault): number {
  return vault.state?.positions?.daysHeld ?? 0;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtPct(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

function fmtLeverage(n: number): string {
  return Number.isInteger(n) ? `${n}x` : `${n.toFixed(2)}x`;
}

export function formatVaultHeader(vault: Vault): string {
  return `Vault \`${shortId(vault.execution.id)}\` (${capitalize(vault.execution.tier)})`;
}

export function formatVaultData(vault: Vault): string {
  const fast = vault.state?.fast;
  const positionsState = vault.state?.positions;
  const kaminoMultiply = positionsState?.positions.kaminoMultiply;
  const claimPreview = positionsState?.claimPreview;
  const fundingUsd = (claimPreview?.fundingReceivedSol.usd ?? 0) - (claimPreview?.fundingPaidSol.usd ?? 0);
  const leverage = vault.positions[0]?.leverage ?? kaminoMultiply?.leverage;

  return [
    `Equity: ${fast ? fmtUsd(fast.equityUsd) : "-"}`,
    `Free USDC: ${fast ? fmtUsd(fast.freeUsdc) : "-"}`,
    `Net Value: ${netValueSol(vault).toFixed(4)} SOL`,
    `Lev: ${leverage !== undefined ? fmtLeverage(leverage) : "-"}`,
    `LTV: ${kaminoMultiply ? fmtPct(kaminoMultiply.ltvBps) : "-"}`,
    `Net Carry APR: ${vault.quantSeriesLatest ? fmtPct(vault.quantSeriesLatest.netCarryApyBps) : "-"}`,
    `Risk Profile: ${capitalize(vault.execution.tier)}`,
    `Short Entry: ${fast ? fmtUsd(fast.perpEntryPrice) : "-"}`,
    `Short: ${fast ? fmtUsd(fast.shortNotionalUsd) : "-"}`,
    `Funding: ${fmtUsd(fundingUsd)}`,
    `uPnL: ${fast ? fmtUsd(fast.unrealizedPnlUsd) : "-"}`,
  ].join("\n");
}

export function formatVaultBlock(vault: Vault): string {
  return `${formatVaultHeader(vault)}\n\n${formatVaultData(vault)}`;
}
