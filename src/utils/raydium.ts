import { DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2';
import { Connection, PublicKey } from '@solana/web3.js';

export const RAYDIUM_CLMM_DEVNET_PROGRAM_ID = DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID.toBase58();
export const RAYDIUM_CLMM_GITHUB = 'https://github.com/raydium-io/raydium-clmm';
export const RAYDIUM_DEVNET_URL = 'https://api-v3.raydium.io';

export type RaydiumDevnetHealth = {
  ok: boolean;
  slot: number;
  programId: string;
  latencyMs: number;
  error?: string;
};

export async function checkRaydiumClmmDevnet(connection: Connection): Promise<RaydiumDevnetHealth> {
  const started = performance.now();
  try {
    const slot = await connection.getSlot('confirmed');
    const programId = new PublicKey(RAYDIUM_CLMM_DEVNET_PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(programId, 'confirmed');
    return {
      ok: Boolean(accountInfo?.executable),
      slot,
      programId: programId.toBase58(),
      latencyMs: Math.round(performance.now() - started),
      error: accountInfo?.executable ? undefined : 'Raydium CLMM program was not reported executable on this cluster',
    };
  } catch (error) {
    return {
      ok: false,
      slot: 0,
      programId: RAYDIUM_CLMM_DEVNET_PROGRAM_ID,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : 'Unable to reach Raydium CLMM on Devnet',
    };
  }
}

export function getRaydiumPoolUrl(poolId?: string): string {
  return poolId
    ? `https://beta.raydium.io/liquidity/position/${poolId}?cluster=devnet`
    : 'https://beta.raydium.io/liquidity/?cluster=devnet';
}

export function isValidRaydiumPoolId(poolId: string): boolean {
  try {
    return PublicKey.isOnCurve(new PublicKey(poolId));
  } catch {
    return false;
  }
}
