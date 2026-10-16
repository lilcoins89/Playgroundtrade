import React, { useState } from 'react';
import { WalletContextProvider } from './context/WalletContextProvider';
import { TradingProvider } from './context/TradingContext';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { PriceChart } from './components/PriceChart';
import { PortfolioHistoryChart } from './components/PortfolioHistoryChart';
import { SwapCard } from './components/SwapCard';
import { TokenWatchlist } from './components/TokenWatchlist';
import { PositionsTable } from './components/PositionsTable';
import { TradeHistory } from './components/TradeHistory';
import { TokenCreator } from './components/TokenCreator';
import { TestSuiteModal } from './components/TestSuiteModal';
import { DevnetGuideModal } from './components/DevnetGuideModal';
import { AutoAirdropModal } from './components/AutoAirdropModal';
import { ProgramWorkspace } from './components/ProgramWorkspace';
import { useTrading } from './context/TradingContext';
import { Activity, CandlestickChart, Columns } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isTestsOpen, setIsTestsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAirdropModalOpen, setIsAirdropModalOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [chartView, setChartView] = useState<'token' | 'portfolio' | 'split'>('token');

  const { activeToken, portfolioSummary } = useTrading();

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-[#9945FF] selection:text-white">
      {/* Sticky Header with safety indicators, mode switcher, and wallet connect */}
      <Header
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenTests={() => setIsTestsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAirdrop={() => setIsAirdropModalOpen(true)}
        onOpenWorkspace={() => setIsWorkspaceOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Top Portfolio Summary & P&L stats */}
        <DashboardStats
          onSelectPortfolioChart={() => setChartView('portfolio')}
          onOpenAirdrop={() => setIsAirdropModalOpen(true)}
        />

        {/* Chart View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111624] p-1.5 rounded-xl border border-[#1d263b]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setChartView('token')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                chartView === 'token'
                  ? 'bg-[#182338] text-white border border-[#232f48] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CandlestickChart className="w-3.5 h-3.5 text-[#14F195]" />
              <span>Token Market Chart ({activeToken.symbol})</span>
            </button>
            <button
              onClick={() => setChartView('portfolio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                chartView === 'portfolio'
                  ? 'bg-[#182338] text-[#14F195] border border-[#14F195]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Portfolio Equity & Daily P&L</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  portfolioSummary.totalReturnPct >= 0
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                }`}
              >
                {portfolioSummary.totalReturnPct >= 0 ? '+' : ''}
                {portfolioSummary.totalReturnPct.toFixed(1)}%
              </span>
            </button>
          </div>

          <button
            onClick={() => setChartView(chartView === 'split' ? 'token' : 'split')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              chartView === 'split'
                ? 'bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/40'
                : 'text-slate-400 hover:text-slate-200 bg-[#0d121c] border border-[#1c2538]'
            }`}
            title="Display both Token chart and Portfolio chart simultaneously"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split View (Both)</span>
          </button>
        </div>

        {/* Core Trading Terminal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Price Chart / Portfolio Chart, Holdings & Trades */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {chartView === 'token' && <PriceChart />}
            {chartView === 'portfolio' && <PortfolioHistoryChart />}
            {chartView === 'split' && (
              <div className="space-y-4">
                <PriceChart />
                <PortfolioHistoryChart />
              </div>
            )}

            <PositionsTable />
            <TradeHistory />
          </div>

          {/* Right Column: Swap Interface & Token Watchlist */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <SwapCard />
            <TokenWatchlist />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#182132] py-4 bg-[#0a0d14] text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Solana Meme Trading Playground • Constant-Product AMM & Devnet SPL Minting</span>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-white transition-colors"
            >
              Devnet Guide
            </button>
            <span>•</span>
            <button
              onClick={() => setIsTestsOpen(true)}
              className="hover:text-white transition-colors"
            >
              Math Test Suite
            </button>
            <span>•</span>
            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Devnet Explorer
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isCreatorOpen && <TokenCreator onClose={() => setIsCreatorOpen(false)} />}
      {isTestsOpen && <TestSuiteModal onClose={() => setIsTestsOpen(false)} />}
      {isGuideOpen && <DevnetGuideModal onClose={() => setIsGuideOpen(false)} />}
      {isAirdropModalOpen && <AutoAirdropModal onClose={() => setIsAirdropModalOpen(false)} />}
      {isWorkspaceOpen && <ProgramWorkspace onClose={() => setIsWorkspaceOpen(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <WalletContextProvider>
      <TradingProvider>
        <MainLayout />
      </TradingProvider>
    </WalletContextProvider>
  );
}
