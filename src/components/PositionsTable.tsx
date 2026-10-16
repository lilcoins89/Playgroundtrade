import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { calculateUnrealizedPnL } from '../utils/pnl';
import { getSpotPrice } from '../utils/amm';

export const PositionsTable: React.FC = () => {
  const {
    positions,
    pools,
    tokens,
    setActiveToken,
    mode,
  } = useTrading();

  const activeHoldings = positions.filter((p) => p.tokenAmount > 0);

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2336] mb-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-400" />
          <h3 className="font-extrabold text-sm text-white">Active Positions & Cost Basis</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {activeHoldings.length} {activeHoldings.length === 1 ? 'Position' : 'Positions'}
        </span>
      </div>

      {activeHoldings.length === 0 ? (
        <div className="py-8 text-center text-slate-500 font-mono text-xs">
          <p>No active positions open.</p>
          <p className="text-[11px] text-slate-600 mt-1">
            {mode === 'practice'
              ? 'Execute a practice buy order above to start testing positions and P&L!'
              : 'Holdings on Devnet appear here when SPL tokens are held.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-[#1b2336] text-[11px]">
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium">Holdings</th>
                <th className="pb-2 font-medium">Avg Entry (SOL)</th>
                <th className="pb-2 font-medium">Current Price</th>
                <th className="pb-2 font-medium">Cost Basis</th>
                <th className="pb-2 font-medium">Market Value</th>
                <th className="pb-2 font-medium">Unrealized P&L</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171f30]">
              {activeHoldings.map((pos) => {
                const pool = pools[pos.tokenId];
                const spotPrice = pool
                  ? getSpotPrice(pool.solReserve, pool.tokenReserve)
                  : pos.averageEntryPriceSol;

                const { currentValueSol, unrealizedPnLSol, unrealizedPnLPct } =
                  calculateUnrealizedPnL(pos, spotPrice);

                const isGain = unrealizedPnLSol >= 0;
                const tokenDef = tokens.find((t) => t.id === pos.tokenId);

                return (
                  <tr key={pos.tokenId} className="hover:bg-[#141b2a]/60 transition-colors">
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white"
                        style={{ backgroundColor: tokenDef?.color || '#9945FF' }}
                      >
                        {pos.tokenSymbol.slice(0, 2)}
                      </div>
                      <div>
                        <div>{pos.tokenSymbol}</div>
                        <div className="text-[10px] text-slate-500 font-normal truncate max-w-[100px]">
                          {pos.tokenName}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-slate-200">
                      <div>
                        {pos.tokenAmount > 1000
                          ? pos.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : pos.tokenAmount.toFixed(4)}
                      </div>
                    </td>

                    <td className="py-3 text-slate-300">
                      {pos.averageEntryPriceSol < 0.0001
                        ? pos.averageEntryPriceSol.toFixed(7)
                        : pos.averageEntryPriceSol.toFixed(5)}
                    </td>

                    <td className="py-3 text-slate-300">
                      {spotPrice < 0.0001 ? spotPrice.toFixed(7) : spotPrice.toFixed(5)}
                    </td>

                    <td className="py-3 text-slate-400">
                      {pos.totalCostSol.toFixed(4)} SOL
                    </td>

                    <td className="py-3 font-semibold text-white">
                      {currentValueSol.toFixed(4)} SOL
                    </td>

                    <td className="py-3">
                      <div
                        className={`font-bold flex items-center gap-0.5 ${
                          isGain ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isGain ? '+' : ''}
                        {unrealizedPnLSol.toFixed(4)} SOL
                        <span className="text-[10px] ml-1">
                          ({isGain ? '+' : ''}
                          {unrealizedPnLPct.toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          if (tokenDef) setActiveToken(tokenDef);
                        }}
                        className="px-2.5 py-1 rounded bg-[#182338] hover:bg-[#22314e] text-[#14F195] border border-[#232f48] transition-colors text-[11px] font-bold"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
