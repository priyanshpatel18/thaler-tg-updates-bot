import { config } from "./config.js";
import { logger } from "./logger.js";
import { getVaultSnapshot, hasAnyVaultSnapshot, setVaultSnapshot } from "./db.js";
import { notifyAll } from "./notify.js";
import { formatVaultData, formatVaultHeader } from "./vaultFormat.js";
import { getWalletVaults, type Vault } from "./thalerApi.js";

interface LifecycleSnapshot {
  openState: string | null;
  closeState: string | null;
  claimState: string | null;
  dismantleState: string | null;
  positionStatus: string | null;
  hasClaimable: boolean;
}

const CLAIMABLE_EPSILON_SOL = 0.0001;

function toLifecycleSnapshot(vault: Vault): LifecycleSnapshot {
  return {
    openState: vault.execution.openState,
    closeState: vault.execution.closeState,
    claimState: vault.execution.claimState,
    dismantleState: vault.execution.dismantleState,
    positionStatus: vault.positions[0]?.status ?? null,
    hasClaimable: (vault.state?.positions?.claimableSol ?? 0) > CLAIMABLE_EPSILON_SOL,
  };
}

function changeSummary(prev: LifecycleSnapshot, next: LifecycleSnapshot): string[] {
  const changes: string[] = [];

  if (prev.openState !== next.openState) {
    changes.push(`open ${prev.openState ?? "-"} → ${next.openState ?? "-"}`);
  }
  if (prev.closeState !== next.closeState) {
    changes.push(`close ${prev.closeState ?? "-"} → ${next.closeState ?? "-"}`);
  }
  if (prev.claimState !== next.claimState) {
    changes.push(`claim ${prev.claimState ?? "-"} → ${next.claimState ?? "-"}`);
  }
  if (prev.dismantleState !== next.dismantleState) {
    changes.push(`dismantle ${prev.dismantleState ?? "-"} → ${next.dismantleState ?? "-"}`);
  }
  if (prev.positionStatus !== next.positionStatus) {
    changes.push(`position ${prev.positionStatus ?? "-"} → ${next.positionStatus ?? "-"}`);
  }
  if (!prev.hasClaimable && next.hasClaimable) {
    changes.push("now claimable");
  }

  return changes;
}

function formatChangeMessage(vault: Vault, changes: string[]): string {
  const header = `${formatVaultHeader(vault)} — ${changes.join(", ")}`;
  return `${header}\n\n${formatVaultData(vault)}`;
}

async function tick(): Promise<void> {
  const response = await getWalletVaults(config.thaler.walletAddress);
  const isBaseline = !hasAnyVaultSnapshot();

  for (const vault of response.vaults) {
    const vaultId = vault.execution.id;
    const next = toLifecycleSnapshot(vault);
    const prev = getVaultSnapshot<LifecycleSnapshot>(vaultId);

    if (prev && !isBaseline) {
      const changes = changeSummary(prev, next);
      if (changes.length > 0) {
        const message = formatChangeMessage(vault, changes);
        logger.info(`Vault change detected: ${vaultId} — ${changes.join(", ")}`);
        await notifyAll(message);
      }
    }

    setVaultSnapshot(vaultId, next);
  }

  if (isBaseline) {
    logger.info(`Vault watcher baseline recorded for ${response.vaults.length} vault(s)`);
  }
}

export function startVaultWatcher(): void {
  async function loop(): Promise<void> {
    for (;;) {
      try {
        await tick();
      } catch (err) {
        logger.error("Vault watcher tick failed", { err });
      }
      await new Promise((resolve) => setTimeout(resolve, config.thaler.pollIntervalMs));
    }
  }

  loop().catch((err) => logger.error("Vault watcher loop crashed", { err }));
}
