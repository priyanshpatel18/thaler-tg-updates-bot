import type { Vault } from "./thalerApi.js";

export function isActiveVault(vault: Vault): boolean {
  return vault.positions[0]?.status === "OPEN";
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export function formatVaultHeader(vault: Vault): string {
  return `Vault \`${vault.execution.walletAddress}\` (${capitalize(vault.execution.tier)})`;
}

export function formatVaultData(vault: Vault, solPriceUsd: number): string {
  const kaminoMultiply = vault.state?.positions?.positions.kaminoMultiply;

  return [
    `SOL Price: ${fmtUsd(solPriceUsd)}`,
    `Value: ${equitySol(vault).toFixed(4)} SOL`,
    `Realized Profit (since last claim): ${realizedProfitSol(vault).toFixed(4)} SOL`,
    `ROI (since last claim): ${roiPct(vault).toFixed(2)}%`,
    `LTV: ${kaminoMultiply ? fmtPct(kaminoMultiply.ltvBps) : "-"}`,
  ].join("\n");
}

export function formatVaultBlock(vault: Vault, solPriceUsd: number): string {
  return `${formatVaultHeader(vault)}\n\n${formatVaultData(vault, solPriceUsd)}`;
}
