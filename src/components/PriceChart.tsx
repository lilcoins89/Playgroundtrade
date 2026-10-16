import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  Layers,
  Info,
  Calendar,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { CandlestickData } from '../types';
import { getSpotPrice } from '../utils/amm';

export const PriceChart: React.FC = () => {
  const { activeToken, candlesticks, pools, mode } = useTrading();
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('5m');
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(null);

  const pool = pools[activeToken.id];
  const currentSpotPrice = pool
    ? getSpotPrice(pool.solReserve, pool.tokenReserve)
    : activeToken.basePriceSol;

  const rawCandles = candlesticks[activeToken.id] || [];

  // Filter or slice candles based on timeframe display
  const candles = useMemo(() => {
    if (rawCandles.length === 0) return [];
    return rawCandles.slice(-35);
  }, [rawCandles]);

  // Compute price ranges for scaling
  const { minPrice, maxPrice, priceRange, maxVol } = useMemo(() => {
    if (candles.length === 0) {
      return { minPrice: 0, maxPrice: 1, priceRange: 1, maxVol: 1 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;

    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxV) maxV = c.volume;
    }

    // Add 8% buffer top and bottom
    const range = max - min || 0.00001;
    const paddedMin = Math.max(0.0000001, min - range * 0.08);
    const paddedMax = max + range * 0.08;

    return {
      minPrice: paddedMin,
      maxPrice: paddedMax,
      priceRange: paddedMax - paddedMin,
      maxVol: maxV || 1,
    };
  }, [candles]);

  const chartHeight = 240;
  const chartWidth = 640;
  const candleSlotWidth = chartWidth / (candles.length || 1);
  const candleBodyWidth = Math.max(3, candleSlotWidth * 0.65);

  const getPriceY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const getVolY = (vol: number) => {
    const volHeight = 50;
    return chartHeight - (vol / maxVol) * volHeight;
  };

  // Generate SVG path for line view
  const linePath = useMemo(() => {
    if (candles.length === 0) return '';
    return candles
      .map((c, i) => {
        const x = i * candleSlotWidth + candleSlotWidth / 2;
        const y = getPriceY(c.close);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [candles, candleSlotWidth, minPrice, priceRange]);

  const areaPath = useMemo(() => {
    if (candles.length === 0 || !linePath) return '';
    const lastX = (candles.length - 1) * candleSlotWidth + candleSlotWidth / 2;
    const firstX = candleSlotWidth / 2;
    return `${linePath} L ${lastX.toFixed(1)} ${chartHeight} L ${firstX.toFixed(1)} ${chartHeight} Z`;
  }, [linePath, candles, candleSlotWidth]);

  const priceChangePct = activeToken.priceChange24h;
  const isPositive = priceChangePct >= 0;

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1b2336]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner"
            style={{ backgroundColor: activeToken.color }}
          >
            {activeToken.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">{activeToken.name}</h2>
              <span className="text-xs font-mono font-bold text-slate-400 bg-[#161f30] px-2 py-0.5 rounded border border-[#232f48]">
                {activeToken.symbol}
              </span>
              {mode === 'practice' && (
                <span className="text-[10px] font-mono font-medium text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  SIMULATED AMM
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-white font-mono tracking-tight">
                {currentSpotPrice < 0.0001
                  ? currentSpotPrice.toFixed(8)
                  : currentSpotPrice.toFixed(6)}{' '}
                SOL
              </span>
              <span
                className={`text-xs font-mono font-bold flex items-center ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isPositive ? '+' : ''}
                {priceChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          {/* Timeframes */}
          <div className="flex bg-[#0b0e14] p-1 rounded-lg border border-[#1e273a] text-xs font-mono">
            {(['1m', '5m', '15m', '1h', '1d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-[#1b253b] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type */}
          <div className="flex bg-[#0b0e14] p-1 rounded-lg border border-[#1e273a]">
            <button
              onClick={() => setChartType('candle')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'candle' ? 'bg-[#1b253b] text-[#14F195]' : 'text-slate-400'
              }`}
              title="Candlestick Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'line' ? 'bg-[#1b253b] text-[#14F195]' : 'text-slate-400'
              }`}
              title="Line Chart"
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hover Info bar */}
      <div className="py-2 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 border-b border-[#171f30]">
        {hoveredCandle ? (
          <div className="flex items-center gap-3">
            <span>O: <span className="text-white">{hoveredCandle.open.toFixed(7)}</span></span>
            <span>H: <span className="text-emerald-400">{hoveredCandle.high.toFixed(7)}</span></span>
            <span>L: <span className="text-rose-400">{hoveredCandle.low.toFixed(7)}</span></span>
            <span>C: <span className="text-white">{hoveredCandle.close.toFixed(7)}</span></span>
            <span>Vol: <span className="text-purple-400">{hoveredCandle.volume.toFixed(2)} SOL</span></span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500">
            <span>24h High: {(maxPrice * 0.98).toFixed(7)} SOL</span>
            <span>24h Low: {(minPrice * 1.02).toFixed(7)} SOL</span>
            <span>24h Vol: {activeToken.volume24hSol.toLocaleString()} SOL</span>
          </div>
        )}
        <div className="text-[10px] text-slate-500">
          Constant-Product AMM (k = {(pool?.k || 0).toLocaleString()})
        </div>
      </div>

      {/* SVG Canvas for Chart */}
      <div className="relative mt-2 w-full h-[250px] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredCandle(null)}
        >
          {/* Horizontal Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pct, i) => {
            const y = chartHeight * pct;
            const priceVal = maxPrice - pct * priceRange;
            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#172033"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - 5}
                  y={y - 4}
                  textAnchor="end"
                  fill="#475569"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  {priceVal.toFixed(7)}
                </text>
              </g>
            );
          })}

          {/* Volume histogram bars at bottom */}
          {candles.map((c, i) => {
            const x = i * candleSlotWidth + (candleSlotWidth - candleBodyWidth) / 2;
            const y = getVolY(c.volume);
            const height = chartHeight - y;
            const isUp = c.close >= c.open;
            return (
              <rect
                key={'vol-' + i}
                x={x}
                y={y}
                width={candleBodyWidth}
                height={Math.max(2, height)}
                fill={isUp ? '#10b981' : '#f43f5e'}
                opacity="0.18"
              />
            );
          })}

          {/* Chart Rendering */}
          {chartType === 'line' ? (
            <g>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14F195" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#14F195" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none" stroke="#14F195" strokeWidth="2" />
            </g>
          ) : (
            /* Candlestick Bars */
            candles.map((c, i) => {
              const xSlotCenter = i * candleSlotWidth + candleSlotWidth / 2;
              const xBar = xSlotCenter - candleBodyWidth / 2;
              const isUp = c.close >= c.open;
              const color = isUp ? '#10b981' : '#f43f5e';

              const highY = getPriceY(c.high);
              const lowY = getPriceY(c.low);
              const openY = getPriceY(c.open);
              const closeY = getPriceY(c.close);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g
                  key={'candle-' + i}
                  onMouseEnter={() => setHoveredCandle(c)}
                  className="cursor-crosshair"
                >
                  {/* Candle Wick */}
                  <line
                    x1={xSlotCenter}
                    y1={highY}
                    x2={xSlotCenter}
                    y2={lowY}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Candle Body */}
                  <rect
                    x={xBar}
                    y={bodyTop}
                    width={candleBodyWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                  {/* Invisible hit-box */}
                  <rect
                    x={i * candleSlotWidth}
                    y={0}
                    width={candleSlotWidth}
                    height={chartHeight}
                    fill="transparent"
                  />
                </g>
              );
            })
          )}

          {/* Current Spot Price Dotted Line */}
          {currentSpotPrice >= minPrice && currentSpotPrice <= maxPrice && (
            <g>
              <line
                x1="0"
                y1={getPriceY(currentSpotPrice)}
                x2={chartWidth}
                y2={getPriceY(currentSpotPrice)}
                stroke="#14F195"
                strokeDasharray="2 2"
                strokeWidth="1.2"
              />
              <rect
                x={chartWidth - 85}
                y={getPriceY(currentSpotPrice) - 8}
                width="80"
                height="16"
                fill="#14F195"
                rx="3"
              />
              <text
                x={chartWidth - 45}
                y={getPriceY(currentSpotPrice) + 4}
                textAnchor="middle"
                fill="#0b0e14"
                fontSize="9"
                fontWeight="bold"
                fontFamily="JetBrains Mono"
              >
                {currentSpotPrice.toFixed(6)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* AMM Pool Reserves Footer */}
      {pool && (
        <div className="mt-3 pt-3 border-t border-[#171f30] grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="bg-[#0b0e14] px-3 py-2 rounded-lg border border-[#1b2336]">
            <span className="text-slate-400 block text-[10px]">SOL Reserve (x)</span>
            <span className="font-bold text-white">{pool.solReserve.toFixed(2)} SOL</span>
          </div>
          <div className="bg-[#0b0e14] px-3 py-2 rounded-lg border border-[#1b2336]">
            <span className="text-slate-400 block text-[10px]">Token Reserve (y)</span>
            <span className="font-bold text-white">
              {Math.floor(pool.tokenReserve).toLocaleString()} {activeToken.symbol}
            </span>
          </div>
          <div className="bg-[#0b0e14] px-3 py-2 rounded-lg border border-[#1b2336]">
            <span className="text-slate-400 block text-[10px]">AMM Fee</span>
            <span className="font-bold text-[#14F195]">{(pool.feeBps / 100).toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
