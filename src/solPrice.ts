import { Connection, PublicKey } from "@solana/web3.js";

// Same feed account and decode logic as FRONTIER/magicblock/realtime-price-tracker,
// but polled on-demand here instead of subscribed to over a websocket.
const connection = new Connection("https://devnet.magicblock.app");
const PRICE_ACCOUNT = new PublicKey("ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu");

export async function getSolPriceUsd(): Promise<number> {
  const accountInfo = await connection.getAccountInfo(PRICE_ACCOUNT, "confirmed");
  if (!accountInfo) {
    throw new Error("SOL price account not found");
  }

  const bytes = accountInfo.data.subarray(73, 81);
  const quantizedValue = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigInt64(0, true);
  return Number(quantizedValue) / 100_000_000;
}
