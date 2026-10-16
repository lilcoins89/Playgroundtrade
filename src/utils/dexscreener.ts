export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  priceNative?: string;
  priceUsd?: string;
  priceChange?: { h24?: number; h6?: number; h1?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  baseToken?: { address: string; name: string; symbol: string };
  quoteToken?: { address: string; name: string; symbol: string };
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { type: string; url: string }[] };
}

export async function fetchDexScreenerToken(mintAddress: string): Promise<DexPair | null> {
  if (!mintAddress || mintAddress.length < 32) return null;
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mintAddress)}`);
    if (!response.ok) throw new Error(`DexScreener returned ${response.status}`);
    const payload = (await response.json()) as { pairs?: DexPair[] };
    return payload.pairs?.find((pair) => pair.chainId === 'solana') ?? payload.pairs?.[0] ?? null;
  } catch (error) {
    console.warn('[v0] DexScreener token lookup failed:', error);
    return null;
  }
}

export function formatUsd(value?: number | string): string {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (parsed === undefined || !Number.isFinite(parsed)) return '—';
  if (parsed < 0.01) return `$${parsed.toFixed(6)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parsed);
}

export function formatCompact(value?: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value ?? 0);
}
