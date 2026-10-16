import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function recordTradeToSupabase(trade: {
  tokenId: string;
  walletAddress?: string;
  type: 'buy' | 'sell' | 'swap';
  solAmount: number;
  tokenAmount: number;
  executionPriceSol: number;
  txSignature?: string;
  errorMessage?: string;
}) {
  if (!supabase) return;
  const { error } = await supabase.from('trades').insert({
    token_id: trade.tokenId,
    wallet_address: trade.walletAddress ?? null,
    side: trade.type,
    amount_sol: trade.solAmount,
    token_amount: trade.tokenAmount,
    price_sol: trade.executionPriceSol,
    signature: trade.txSignature ?? null,
    network: 'devnet',
    error_message: trade.errorMessage ?? null,
  });
  if (error) console.warn('[v0] Supabase trade persistence failed:', error.message);
}

export async function syncTokensToSupabase(tokens: Array<{
  id: string;
  symbol: string;
  name: string;
  mintAddress: string;
  iconUrl?: string;
  description: string;
  decimals: number;
  basePriceSol: number;
  marketCapSol: number;
}>) {
  if (!supabase) return;
  const { error } = await supabase.from('tokens').upsert(
    tokens.map((token) => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      mint_address: token.mintAddress || null,
      logo_url: token.iconUrl ?? null,
      description: token.description,
      decimals: token.decimals,
      base_price_sol: token.basePriceSol,
      market_cap_sol: token.marketCapSol,
      metadata: { network: 'devnet', source: 'playgroundtrade' },
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' },
  );
  if (error) console.warn('[v0] Supabase token sync failed:', error.message);
}

export async function recordMarketSnapshotToSupabase(snapshot: {
  tokenId: string;
  priceSol: number;
  volumeSol?: number;
  liquiditySol?: number;
}) {
  if (!supabase || !Number.isFinite(snapshot.priceSol) || snapshot.priceSol < 0) return;
  const { error } = await supabase.from('market_snapshots').insert({
    token_id: snapshot.tokenId,
    price_sol: snapshot.priceSol,
    volume_sol: snapshot.volumeSol ?? 0,
    liquidity_sol: snapshot.liquiditySol ?? 0,
  });
  if (error) console.warn('[v0] Supabase market snapshot persistence failed:', error.message);
}

export function subscribeToMarketData(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel('playgroundtrade-market')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'market_snapshots' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
