import React from 'react';
import { Search, TrendingUp, TrendingDown, Flame, Zap } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { getSpotPrice } from '../utils/amm';

export const TokenWatchlist: React.FC = () => {
  const {
    tokens,
    activeToken,
    setActiveToken,
    pools,
    searchQuery,
    setSearchQuery,
  } = useTrading();

  const filteredTokens = tokens.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.mintAddress.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 shadow-sm flex flex-col h-full">
      {/* Search Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2336] mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#14F195]" />
          <h3 className="font-extrabold text-sm text-white">Meme Watchlist</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {filteredTokens.length} Tokens
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, symbol, or mint..."
          className="w-full bg-[#0b0e14] border border-[#1d263b] focus:border-[#2f3d5c] pl-9 pr-3 py-1.5 rounded-xl text-xs font-mono text-white placeholder-slate-600 outline-none"
        />
      </div>

      {/* Watchlist Table */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px]">
        {filteredTokens.map((token) => {
          const pool = pools[token.id];
          const spotPrice = pool
            ? getSpotPrice(pool.solReserve, pool.tokenReserve)
            : token.basePriceSol;
          const isSelected = activeToken.id === token.id;
          const isUp = token.priceChange24h >= 0;

          return (
            <button
              key={token.id}
              onClick={() => setActiveToken(token)}
              className={`w-full text-left p-2.5 rounded-xl transition-all border flex items-center justify-between ${
                isSelected
                  ? 'bg-[#182338] border-[#14F195]/40 shadow-sm'
                  : 'bg-[#0d121c] border-transparent hover:border-[#1d263b] hover:bg-[#131926]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: token.color }}
                >
                  {token.symbol.slice(0, 2)}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">{token.name}</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {token.symbol}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    Vol: {token.volume24hSol.toFixed(1)} SOL
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-white">
                  {spotPrice < 0.0001 ? spotPrice.toFixed(7) : spotPrice.toFixed(5)} SOL
                </div>
                <div
                  className={`text-[10px] font-mono font-semibold flex items-center justify-end ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                  {isUp ? '+' : ''}
                  {token.priceChange24h.toFixed(1)}%
                </div>
              </div>
            </button>
          );
        })}

        {filteredTokens.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No tokens matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
