import React, { useState, useMemo } from 'react';
import {
  LineChart as LineChartIcon,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Award,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { PortfolioSnapshot, DailyPnLEntry } from '../types';

type ChartMode = 'performance' | 'dailyPnl';
type TimeframeFilter = '24h' | '7d' | '14d' | 'all';

const SOL_USD_ESTIMATE = 150.0;

export const PortfolioHistoryChart: React.FC = () => {
  const {
    portfolioSnapshots,
    dailyPnLEntries,
    portfolioSummary,
    initialPracticeSol,
    practiceSol,
    mode,
    devnetSolBalance,
  } = useTrading();

  const [chartMode, setChartMode] = useState<ChartMode>('performance');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [hoveredSnapshot, setHoveredSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [hoveredDaily, setHoveredDaily] = useState<DailyPnLEntry | null>(null);

  const activeCurrentVal =
    mode === 'practice'
      ? portfolioSummary.totalPortfolioValueSol
      : devnetSolBalance;

  // Filter snapshots according to selected timeframe
  const filteredSnapshots = useMemo(() => {
    if (portfolioSnapshots.length === 0) return [];
    const now = Date.now();
    let cutoff = 0;
    if (timeframe === '24h') cutoff = now - 24 * 60 * 60 * 1000;
    else if (timeframe === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === '14d') cutoff = now - 14 * 24 * 60 * 60 * 1000;

    const filtered = cutoff > 0 ? portfolioSnapshots.filter((s) => s.timestamp >= cutoff) : portfolioSnapshots;
    return filtered.length > 1 ? filtered : portfolioSnapshots;
  }, [portfolioSnapshots, timeframe]);

  // Filter daily entries
  const filteredDaily = useMemo(() => {
    if (dailyPnLEntries.length === 0) return [];
    if (timeframe === '24h') return dailyPnLEntries.slice(-1);
    if (timeframe === '7d') return dailyPnLEntries.slice(-7);
    if (timeframe === '14d') return dailyPnLEntries.slice(-14);
    return dailyPnLEntries;
  }, [dailyPnLEntries, timeframe]);

  // Performance calculations
  const totalNetGain = activeCurrentVal - initialPracticeSol;
  const isOverallGain = totalNetGain >= 0;

  // Daily statistics (wins vs losses)
  const stats = useMemo(() => {
    let winDays = 0;
    let lossDays = 0;
    let bestDay = -Infinity;
    let worstDay = Infinity;

    for (const d of filteredDaily) {
      if (d.netPnLSol > 0) winDays++;
      else if (d.netPnLSol < 0) lossDays++;

      if (d.netPnLSol > bestDay) bestDay = d.netPnLSol;
      if (d.netPnLSol < worstDay) worstDay = d.netPnLSol;
    }

    if (bestDay === -Infinity) bestDay = 0;
    if (worstDay === Infinity) worstDay = 0;

    return {
      winDays,
      lossDays,
      bestDay,
      worstDay,
      winRate: filteredDaily.length > 0 ? (winDays / (winDays + lossDays || 1)) * 100 : 0,
    };
  }, [filteredDaily]);

  // SVG dimensions for Line Chart
  const svgWidth = 680;
  const svgHeight = 220;

  const { minVal, maxVal, valRange } = useMemo(() => {
    if (filteredSnapshots.length === 0) return { minVal: 0, maxVal: 1, valRange: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const s of filteredSnapshots) {
      if (s.portfolioValueSol < min) min = s.portfolioValueSol;
      if (s.portfolioValueSol > max) max = s.portfolioValueSol;
    }
    // Also include initialPracticeSol to show baseline
    min = Math.min(min, initialPracticeSol);
    max = Math.max(max, initialPracticeSol);

    const range = max - min || 1;
    const padMin = Math.max(0, min - range * 0.12);
    const padMax = max + range * 0.12;
    return {
      minVal: padMin,
      maxVal: padMax,
      valRange: padMax - padMin,
    };
  }, [filteredSnapshots, initialPracticeSol]);

  const getY = (val: number) => {
    return svgHeight - ((val - minVal) / valRange) * svgHeight;
  };

  const linePoints = useMemo(() => {
    if (filteredSnapshots.length === 0) return '';
    const step = svgWidth / (filteredSnapshots.length - 1 || 1);
    return filteredSnapshots
      .map((s, i) => {
        const x = i * step;
        const y = getY(s.portfolioValueSol);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [filteredSnapshots, minVal, valRange]);

  const areaPoints = useMemo(() => {
    if (!linePoints || filteredSnapshots.length === 0) return '';
    return `${linePoints} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  }, [linePoints, filteredSnapshots]);

  // Bar Chart calculations for Daily P&L
  const maxAbsPnl = useMemo(() => {
    if (filteredDaily.length === 0) return 1;
    let max = 0.1;
    for (const d of filteredDaily) {
      const abs = Math.abs(d.netPnLSol);
      if (abs > max) max = abs;
    }
    return max * 1.25; // 25% padding
  }, [filteredDaily]);

  const barChartHeight = 220;
  const barZeroY = barChartHeight / 2;
  const barSlotWidth = svgWidth / (filteredDaily.length || 1);
  const barWidth = Math.min(32, Math.max(8, barSlotWidth * 0.55));

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1b2336] mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14F195]/20 to-[#9945FF]/20 border border-[#14F195]/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#14F195]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">Portfolio Analytics</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#182338] text-slate-300 border border-[#232f48]">
                {chartMode === 'performance' ? 'Historical Equity' : 'Daily P&L Heatmap'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {chartMode === 'performance'
                ? 'Track portfolio valuation curve over time'
                : 'Daily net profit & loss bar distribution'}
            </p>
          </div>
        </div>

        {/* View Switcher & Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher: Line Chart vs Bar Chart */}
          <div className="flex bg-[#0b0e14] p-1 rounded-lg border border-[#1e273a]">
            <button
              onClick={() => setChartMode('performance')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartMode === 'performance'
                  ? 'bg-[#1b253b] text-[#14F195] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Performance</span>
            </button>
            <button
              onClick={() => setChartMode('dailyPnl')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartMode === 'dailyPnl'
                  ? 'bg-[#1b253b] text-[#14F195] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Daily P&L</span>
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex bg-[#0b0e14] p-1 rounded-lg border border-[#1e273a] text-xs font-mono">
            {(['24h', '7d', '14d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition-colors uppercase ${
                  timeframe === tf
                    ? 'bg-[#1b253b] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot / Daily Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1a2336]">
          <span className="text-[10px] text-slate-500 font-mono block">Current Valuation</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-extrabold text-white font-mono">
              {activeCurrentVal.toFixed(4)}
            </span>
            <span className="text-[10px] font-mono text-[#14F195]">SOL</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            ≈ ${(activeCurrentVal * SOL_USD_ESTIMATE).toFixed(2)}
          </span>
        </div>

        <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1a2336]">
          <span className="text-[10px] text-slate-500 font-mono block">Net P&L Return</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-sm font-extrabold font-mono flex items-center ${
                isOverallGain ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isOverallGain ? '+' : ''}
              {totalNetGain.toFixed(4)} SOL
            </span>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold ${
              isOverallGain ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isOverallGain ? '+' : ''}
            {((totalNetGain / (initialPracticeSol || 1)) * 100).toFixed(2)}%
          </span>
        </div>

        <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1a2336]">
          <span className="text-[10px] text-slate-500 font-mono block">Win / Loss Days</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              {stats.winDays}W
            </span>
            <span className="text-xs text-slate-500">/</span>
            <span className="text-sm font-extrabold text-rose-400 font-mono">
              {stats.lossDays}L
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {stats.winRate.toFixed(0)}% Win Rate
          </span>
        </div>

        <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1a2336]">
          <span className="text-[10px] text-slate-500 font-mono block">Best / Worst Day</span>
          <div className="text-xs font-mono mt-0.5 flex items-center justify-between">
            <span className="text-emerald-400 font-bold">
              +{stats.bestDay.toFixed(3)}
            </span>
            <span className="text-rose-400 font-bold">
              {stats.worstDay.toFixed(3)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">SOL peak swing</span>
        </div>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="h-6 flex items-center justify-between text-[11px] font-mono px-2 text-slate-400 mb-1">
        {chartMode === 'performance' ? (
          hoveredSnapshot ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-300">
                {new Date(hoveredSnapshot.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>
                Valuation: <strong className="text-white">{hoveredSnapshot.portfolioValueSol.toFixed(4)} SOL</strong>
              </span>
              <span>
                Available SOL: <strong className="text-[#14F195]">{hoveredSnapshot.availableSol.toFixed(4)}</strong>
              </span>
              <span>
                Holdings: <strong className="text-purple-400">{hoveredSnapshot.holdingsValueSol.toFixed(4)} SOL</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-[10px]">
              Hover over the equity curve to inspect historical portfolio valuation
            </span>
          )
        ) : hoveredDaily ? (
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-bold">{hoveredDaily.date} ({hoveredDaily.dayLabel})</span>
            <span>
              Net P&L:{' '}
              <strong className={hoveredDaily.netPnLSol >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {hoveredDaily.netPnLSol >= 0 ? '+' : ''}
                {hoveredDaily.netPnLSol.toFixed(4)} SOL
              </strong>
            </span>
            <span>
              Realized: <strong className="text-slate-200">{hoveredDaily.realizedPnLSol.toFixed(4)} SOL</strong>
            </span>
            <span>
              Trades: <strong className="text-purple-400">{hoveredDaily.tradesCount}</strong>
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-[10px]">
            Hover over any daily bar to inspect detailed realized & net P&L metrics
          </span>
        )}
      </div>

      {/* Main SVG Chart Container */}
      <div className="relative w-full h-[220px] bg-[#0b0e14] rounded-xl border border-[#171f30] overflow-hidden select-none">
        {chartMode === 'performance' ? (
          /* ================= LINE / AREA CHART ================= */
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredSnapshot(null)}
          >
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isOverallGain ? '#14F195' : '#9945FF'}
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor={isOverallGain ? '#14F195' : '#9945FF'}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => {
              const y = svgHeight * pct;
              const val = maxVal - pct * valRange;
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2={svgWidth}
                    y2={y}
                    stroke="#162032"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={svgWidth - 6}
                    y={y - 4}
                    textAnchor="end"
                    fill="#475569"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {val.toFixed(2)} SOL
                  </text>
                </g>
              );
            })}

            {/* Baseline for Starting Balance (e.g. 10.0 SOL) */}
            {initialPracticeSol >= minVal && initialPracticeSol <= maxVal && (
              <g>
                <line
                  x1="0"
                  y1={getY(initialPracticeSol)}
                  x2={svgWidth}
                  y2={getY(initialPracticeSol)}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <text
                  x="8"
                  y={getY(initialPracticeSol) - 4}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  Baseline: {initialPracticeSol.toFixed(1)} SOL
                </text>
              </g>
            )}

            {/* Area gradient under line */}
            <path d={areaPoints} fill="url(#equityGrad)" />

            {/* Line curve */}
            <path
              d={linePoints}
              fill="none"
              stroke={isOverallGain ? '#14F195' : '#a855f7'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive hover points & trigger bars */}
            {filteredSnapshots.map((s, idx) => {
              const step = svgWidth / (filteredSnapshots.length - 1 || 1);
              const x = idx * step;
              const y = getY(s.portfolioValueSol);
              const isHovered = hoveredSnapshot === s;

              return (
                <g key={idx}>
                  {/* Invisible broad mouse hover area */}
                  <rect
                    x={x - step / 2}
                    y={0}
                    width={step}
                    height={svgHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredSnapshot(s)}
                    className="cursor-crosshair"
                  />
                  {/* Hover vertical crosshair */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={svgHeight}
                      stroke="#14F195"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                  )}
                  {/* Circle dot on curve */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 2.5}
                    fill={isHovered ? '#ffffff' : isOverallGain ? '#14F195' : '#a855f7'}
                    stroke="#0b0e14"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          /* ================= BAR CHART (DAILY P&L) ================= */
          <svg
            viewBox={`0 0 ${svgWidth} ${barChartHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredDaily(null)}
          >
            {/* Zero Axis Reference Line */}
            <line
              x1="0"
              y1={barZeroY}
              x2={svgWidth}
              y2={barZeroY}
              stroke="#2e3c54"
              strokeWidth="1.5"
            />
            <text
              x="8"
              y={barZeroY - 4}
              fill="#64748b"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              0.00 SOL Baseline
            </text>

            {/* Daily Bars */}
            {filteredDaily.map((entry, idx) => {
              const slotCenter = idx * barSlotWidth + barSlotWidth / 2;
              const barX = slotCenter - barWidth / 2;
              const isProfit = entry.netPnLSol >= 0;

              // Height scaled relative to maxAbsPnl
              const heightMagnitude = (Math.abs(entry.netPnLSol) / maxAbsPnl) * (barChartHeight / 2 - 15);
              const safeHeight = Math.max(3, heightMagnitude);

              const barY = isProfit ? barZeroY - safeHeight : barZeroY;
              const barColor = isProfit ? '#10b981' : '#f43f5e';
              const isHovered = hoveredDaily === entry;

              return (
                <g
                  key={entry.date}
                  onMouseEnter={() => setHoveredDaily(entry)}
                  className="cursor-pointer"
                >
                  {/* Invisible broad hit box */}
                  <rect
                    x={idx * barSlotWidth}
                    y={0}
                    width={barSlotWidth}
                    height={barChartHeight}
                    fill="transparent"
                  />

                  {/* Vertical bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={safeHeight}
                    fill={barColor}
                    opacity={isHovered ? 1 : 0.85}
                    rx="3"
                  />

                  {/* Label for Day */}
                  <text
                    x={slotCenter}
                    y={barChartHeight - 6}
                    textAnchor="middle"
                    fill={isHovered ? '#ffffff' : '#64748b'}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {entry.dayLabel}
                  </text>

                  {/* Value tag above/below bar */}
                  {safeHeight > 18 && (
                    <text
                      x={slotCenter}
                      y={isProfit ? barY - 4 : barY + safeHeight + 10}
                      textAnchor="middle"
                      fill={isProfit ? '#14F195' : '#fb7185'}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      {entry.netPnLSol >= 0 ? '+' : ''}
                      {entry.netPnLSol.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-[#171f30] flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span>Starting Capital: {initialPracticeSol.toFixed(1)} SOL</span>
          <span>•</span>
          <span>Mode: {mode === 'practice' ? 'Simulated Trading' : 'On-chain Solana'}</span>
        </div>
        <div className="text-[11px] text-slate-400">
          {chartMode === 'performance' ? (
            <span>Data: {filteredSnapshots.length} chronological snapshots</span>
          ) : (
            <span>Data: {filteredDaily.length} recorded daily periods</span>
          )}
        </div>
      </div>
    </div>
  );
};
