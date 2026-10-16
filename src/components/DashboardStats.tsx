import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';

// Virtual SOL price benchmark for USD display
const SOL_USD_ESTIMATE = 150.0;

interface DashboardStatsProps {
  onSelectPortfolioChart?: () => void;
  onOpenAirdrop?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  onSelectPortfolioChart,
  onOpenAirdrop,
}) => {
  const {
    mode,
    practiceSol,
    devnetSolBalance,
    portfolioSummary,
    positions,
    totalAirdroppedSol,
    autoAirdropEnabled,
  } = useTrading();

  const activeSol = mode === 'practice' ? practiceSol : devnetSolBalance;
  const isPractice = mode === 'practice';

  const realizedPnL = isPractice ? portfolioSummary.totalRealizedPnLSol : 0;
  const unrealizedPnL = isPractice ? portfolioSummary.totalUnrealizedPnLSol : 0;
  const totalReturnPct = isPractice ? portfolioSummary.totalReturnPct : 0;
  const totalPortfolioValue = isPractice
    ? portfolioSummary.totalPortfolioValueSol
    : devnetSolBalance;

  const totalPositionsCount = positions.filter((p) => p.tokenAmount > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      {/* Total Portfolio Value */}
      <div
        onClick={onSelectPortfolioChart}
        className={`bg-[#111624] border border-[#1d263b] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm transition-all ${
          onSelectPortfolioChart ? 'cursor-pointer hover:border-purple-500/40 hover:bg-[#141b2b]' : ''
        }`}
        title="Click to view historical portfolio performance chart"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Total Portfolio Value</span>
          <Wallet className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-white font-mono tracking-tight">
              {totalPortfolioValue.toFixed(4)}
            </span>
            <span className="text-xs font-mono font-semibold text-purple-400">SOL</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            ≈ ${(totalPortfolioValue * SOL_USD_ESTIMATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Available SOL */}
      <div className="bg-[#111624] border border-[#1d263b] rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium flex items-center gap-1.5">
            {!isPractice && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            {isPractice ? 'Virtual SOL Balance' : 'Live Devnet SOL'}
          </span>
          <PiggyBank className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-white font-mono tracking-tight">
              {activeSol.toFixed(4)}
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-400">SOL</span>
          </div>
          {!isPractice ? (
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[10px] text-slate-500 font-mono">Real-time RPC Sync</span>
              {onOpenAirdrop && (
                <button
                  onClick={onOpenAirdrop}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-[#14F195] hover:text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30 transition-colors"
                  title="Devnet Airdrops executed"
                >
                  <Zap className="w-2.5 h-2.5 text-[#14F195]" />
                  <span>Airdrop: {totalAirdroppedSol > 0 ? `${totalAirdroppedSol} SOL` : 'Active'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Free practice capital
            </div>
          )}
        </div>
      </div>

      {/* Unrealized P&L */}
      <div
        onClick={onSelectPortfolioChart}
        className={`bg-[#111624] border border-[#1d263b] rounded-xl p-3.5 flex flex-col justify-between shadow-sm transition-all ${
          onSelectPortfolioChart ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-[#141b2b]' : ''
        }`}
        title="Click to view daily P&L breakdown"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Unrealized P&L</span>
          {unrealizedPnL >= 0 ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {unrealizedPnL >= 0 ? '+' : ''}
              {unrealizedPnL.toFixed(4)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-400">SOL</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {isPractice ? `${totalPositionsCount} open positions` : 'On-chain tokens'}
          </div>
        </div>
      </div>

      {/* Realized P&L */}
      <div
        onClick={onSelectPortfolioChart}
        className={`bg-[#111624] border border-[#1d263b] rounded-xl p-3.5 flex flex-col justify-between shadow-sm transition-all ${
          onSelectPortfolioChart ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-[#141b2b]' : ''
        }`}
        title="Click to view daily P&L breakdown"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Realized P&L</span>
          {realizedPnL >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {realizedPnL >= 0 ? '+' : ''}
              {realizedPnL.toFixed(4)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-400">SOL</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            From closed & partial sells
          </div>
        </div>
      </div>

      {/* Overall Return ROI */}
      <div
        onClick={onSelectPortfolioChart}
        className={`bg-[#111624] border border-[#1d263b] rounded-xl p-3.5 flex flex-col justify-between shadow-sm col-span-2 lg:col-span-1 transition-all ${
          onSelectPortfolioChart ? 'cursor-pointer hover:border-amber-500/40 hover:bg-[#141b2b]' : ''
        }`}
        title="Click to view portfolio performance curve"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Total Return</span>
          <Percent className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalReturnPct >= 0 ? '+' : ''}
              {totalReturnPct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            Base: {portfolioSummary.initialVirtualSol} SOL
          </div>
        </div>
      </div>
    </div>
  );
};
