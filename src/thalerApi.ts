import { config } from "./config.js";

export interface VaultExecution {
  id: string;
  tier: string;
  walletAddress: string;
  equityLamports: number | string;
  openState: string | null;
  closeState: string | null;
  claimState: string | null;
  dismantleState: string | null;
}

export interface VaultPosition {
  status: string;
  leverage: number;
}

export interface Vault {
  execution: VaultExecution;
  positions: VaultPosition[];
  quantSeriesLatest: {
    netValueSolLamports: number | string;
    netCarryApyBps: number;
  };
  state: {
    fast: {
      equityUsd: number;
      freeUsdc: number;
      perpEntryPrice: number;
      shortNotionalUsd: number;
      unrealizedPnlUsd: number;
    };
    positions?: {
      claimableSol: number;
      realizedYieldLamports: number | string;
      daysHeld: number;
      positions: {
        kaminoMultiply?: {
          ltvBps: number;
          leverage: number;
        };
        perps?: {
          markPrice: number;
        };
      };
      claimPreview: {
        fundingReceivedSol: { usd: number };
        fundingPaidSol: { usd: number };
      };
    };
  } | null;
}

export interface WalletVaultsResponse {
  wallet: {
    id: string;
    userId: string;
    chainType: string;
    address: string;
    purpose: string;
    createdAt: number;
  };
  asOf: number;
  totals: Record<string, unknown>;
  vaults: Vault[];
}

export async function getWalletVaults(address: string): Promise<WalletVaultsResponse> {
  const res = await fetch(`${config.thaler.baseUrl}/user-api/wallet-vaults/${address}`, {
    headers: { "x-api-key": config.thaler.apiKey },
  });

  if (!res.ok) {
    throw new Error(`Thaler API request failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as WalletVaultsResponse;
}
