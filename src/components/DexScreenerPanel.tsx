import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { DexPair, fetchDexScreenerToken, formatCompact, formatUsd } from '../utils/dexscreener';

export const DexScreenerPanel: React.FC = () => {
  const { activeToken } = useTrading();
  const [pair, setPair] = useState<DexPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await fetchDexScreenerToken(activeToken.mintAddress);
      if (!cancelled) {
        setPair(result);
        setLastUpdated(Date.now());
        setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeToken.mintAddress]);

  const change = pair?.priceChange?.h24 ?? activeToken.priceChange24h;
  const imageUrl = pair?.info?.imageUrl || activeToken.iconUrl;

  return (
    <section className="rounded-2xl border border-[#1d263b] bg-[#111624] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#1b2336] pb-3">
        <div className="flex items-center gap-2">
          {imageUrl ? <img src={imageUrl} alt={`${activeToken.name} logo`} className="size-8 rounded-lg object-cover" /> : <div className="size-8 rounded-lg bg-[#9945FF]" aria-hidden="true" />}
          <div>
            <h2 className="text-sm font-extrabold text-white">{pair?.baseToken?.name || activeToken.name}</h2>
            <p className="font-mono text-[10px] text-slate-500">{pair?.baseToken?.symbol || activeToken.symbol} · {pair?.dexId || 'Raydium pool'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400"><Radio className="size-3" /> LIVE</div>
      </div>

      {pair ? (
        <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
          <div><p className="text-slate-500">USD price</p><p className="font-mono font-bold text-white">{formatUsd(pair.priceUsd)}</p></div>
          <div><p className="text-slate-500">24h change</p><p className={`font-mono font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</p></div>
          <div><p className="text-slate-500">24h volume</p><p className="font-mono font-bold text-white">{formatUsd(pair.volume?.h24)}</p></div>
          <div><p className="text-slate-500">Liquidity</p><p className="font-mono font-bold text-white">{formatUsd(pair.liquidity?.usd)}</p></div>
          <div><p className="text-slate-500">Market cap</p><p className="font-mono font-bold text-white">{formatCompact(pair.marketCap || pair.fdv)}</p></div>
          <div><p className="text-slate-500">Pair</p><p className="truncate font-mono font-bold text-white">{pair.pairAddress}</p></div>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-4 text-xs text-slate-400">{loading && <RefreshCw className="size-3 animate-spin" />} No indexed market pair for this token yet. Trades still route through the local/Raydium workflow.</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Waiting for market data'}</span>
        {pair?.url && <a href={pair.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#14F195] hover:underline">Open DexScreener <ExternalLink className="size-3" /></a>}
      </div>
    </section>
  );
};
