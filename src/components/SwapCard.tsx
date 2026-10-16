import React, { useState, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  ArrowDownUp,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { calculateBuyQuote, calculateSellQuote, getSpotPrice } from '../utils/amm';
import { getExplorerUrl, shortenAddress } from '../utils/solana';
import confetti from 'canvas-confetti';

export const SwapCard: React.FC = () => {
  const {
    mode,
    activeToken,
    pools,
    positions,
    practiceSol,
    devnetSolBalance,
    devnetTokenBalance,
    devnetStatus,
    slippageTolerance,
    setSlippageTolerance,
    executePracticeSwap,
    executeDevnetSwap,
    refreshDevnetData,
  } = useTrading();

  const wallet = useWallet();
  const { connection } = useConnection();

  const [swapType, setSwapType] = useState<'buy' | 'sell'>('buy');
  const [inputVal, setInputVal] = useState<string>('');
  const [isSlippageOpen, setIsSlippageOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    signature?: string;
  } | null>(null);

  const pool = pools[activeToken.id];
  const userPosition = positions.find((p) => p.tokenId === activeToken.id);
  const tokenBalance = userPosition?.tokenAmount || 0;

  const currentSpotPrice = pool
    ? getSpotPrice(pool.solReserve, pool.tokenReserve)
    : activeToken.basePriceSol;

  const numericInput = parseFloat(inputVal) || 0;

  // Calculate live swap quote from constant-product AMM
  const quote = useMemo(() => {
    if (!pool) return null;
    if (swapType === 'buy') {
      return calculateBuyQuote(pool, numericInput, slippageTolerance);
    } else {
      return calculateSellQuote(pool, numericInput, slippageTolerance);
    }
  }, [pool, swapType, numericInput, slippageTolerance]);

  // Balance checking
  const maxAvailableInput = useMemo(() => {
    if (mode === 'practice') {
      return swapType === 'buy' ? practiceSol : tokenBalance;
    } else {
      return swapType === 'buy' ? devnetSolBalance : devnetTokenBalance;
    }
  }, [mode, swapType, practiceSol, tokenBalance, devnetSolBalance, devnetTokenBalance]);

  const hasInsufficientBalance = numericInput > maxAvailableInput;
  const isInputZeroOrNegative = numericInput <= 0;

  const handleCopyMint = () => {
    if (!activeToken.mintAddress) return;
    navigator.clipboard.writeText(activeToken.mintAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preset button actions
  const handlePresetSelect = (ratio: number) => {
    const val = maxAvailableInput * ratio;
    if (swapType === 'buy') {
      setInputVal(val.toFixed(4));
    } else {
      setInputVal(Math.floor(val).toString());
    }
  };

  const handleFixedSolSelect = (sol: number) => {
    setInputVal(sol.toString());
  };

  // Submit swap
  const handleProceedSwap = async () => {
    if (!quote || quote.outputAmount <= 0) return;
    setIsSubmitting(true);
    setFeedback(null);

    if (mode === 'practice') {
      // Practice mode execution via simulated AMM
      setTimeout(() => {
        const result = executePracticeSwap(quote);
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);

        if (result.success) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
          setFeedback({
            type: 'success',
            message: `Successfully swapped ${numericInput} ${swapType === 'buy' ? 'SOL' : activeToken.symbol} for ${quote.outputAmount.toFixed(4)} ${swapType === 'buy' ? activeToken.symbol : 'SOL'}!`,
          });
          setInputVal('');
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Practice swap failed',
          });
        }
      }, 500);
    } else {
      // Devnet Mode Real-Time On-Chain Execution
      if (!wallet.connected || !wallet.publicKey) {
        setIsSubmitting(false);
        setFeedback({
          type: 'error',
          message: 'Please connect your Solana wallet (Phantom or Solflare) to trade on Devnet.',
        });
        return;
      }

      try {
        const res = await executeDevnetSwap(quote);
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);

        if (res.success && res.signature) {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 },
          });
          setFeedback({
            type: 'success',
            message: `Confirmed on Solana Devnet! Swapped ${numericInput} ${
              swapType === 'buy' ? 'SOL' : activeToken.symbol
            } for ${quote.outputAmount.toFixed(4)} ${
              swapType === 'buy' ? activeToken.symbol : 'SOL'
            }`,
            signature: res.signature,
          });
          setInputVal('');
        } else {
          setFeedback({
            type: 'error',
            message: res.error || 'Devnet transaction failed or was rejected.',
          });
        }
      } catch (err: any) {
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        setFeedback({
          type: 'error',
          message: err?.message || 'Transaction error on Solana Devnet',
        });
      }
    }
  };

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 shadow-sm relative">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2336] mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
            style={{ backgroundColor: activeToken.color }}
          >
            {activeToken.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm">Swap {activeToken.symbol}</span>
              <span className="text-[10px] font-mono text-slate-400 bg-[#161f30] px-1.5 py-0.5 rounded border border-[#232f48]">
                {mode === 'practice' ? 'Simulated AMM' : 'Devnet Cluster'}
              </span>
            </div>
            {activeToken.mintAddress && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <span>{shortenAddress(activeToken.mintAddress, 5)}</span>
                <button
                  onClick={handleCopyMint}
                  className="hover:text-white transition-colors"
                  title="Copy Mint"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
                <a
                  href={getExplorerUrl(activeToken.mintAddress, 'address')}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#14F195] transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                {copied && <span className="text-[#14F195] text-[9px]">Copied!</span>}
              </div>
            )}
          </div>
        </div>

        {/* Slippage Settings Button */}
        <button
          onClick={() => setIsSlippageOpen(!isSlippageOpen)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono ${
            isSlippageOpen
              ? 'bg-[#1e2a42] text-[#14F195] border-[#14F195]/40'
              : 'bg-[#141b2a] text-slate-400 border-[#232f48] hover:text-slate-200'
          }`}
          title="Slippage settings"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{slippageTolerance}%</span>
        </button>
      </div>

      {/* Slippage Settings Popover */}
      {isSlippageOpen && (
        <div className="mb-3 p-3 bg-[#0d121c] border border-[#232f48] rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Slippage Tolerance</span>
            <span className="text-slate-500 text-[10px]">Max acceptable price difference</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0.1, 0.5, 1.0, 3.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setSlippageTolerance(rate)}
                className={`flex-1 py-1 rounded font-mono font-medium transition-colors ${
                  slippageTolerance === rate
                    ? 'bg-[#14F195] text-black font-bold'
                    : 'bg-[#172134] text-slate-300 hover:bg-[#202d46]'
                }`}
              >
                {rate}%
              </button>
            ))}
            <div className="relative w-20">
              <input
                type="number"
                step="0.1"
                min="0.05"
                max="50"
                value={slippageTolerance}
                onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
                className="w-full bg-[#172134] border border-[#232f48] px-2 py-1 rounded text-white font-mono text-center outline-none"
              />
              <span className="absolute right-2 top-1 text-slate-400 font-mono">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Buy / Sell Tab Switches */}
      <div className="grid grid-cols-2 p-1 bg-[#0b0e14] rounded-xl border border-[#1b2336] mb-3">
        <button
          onClick={() => {
            setSwapType('buy');
            setInputVal('');
            setFeedback(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            swapType === 'buy'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Buy {activeToken.symbol}
        </button>
        <button
          onClick={() => {
            setSwapType('sell');
            setInputVal('');
            setFeedback(null);
          }}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            swapType === 'sell'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sell {activeToken.symbol}
        </button>
      </div>

      {/* Input Box */}
      <div className="bg-[#0b0e14] border border-[#1d263b] rounded-xl p-3 mb-2 focus-within:border-[#2f3d5c] transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>You Pay</span>
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span>Available:</span>
            <span className="text-white font-bold">
              {maxAvailableInput < 0.0001
                ? maxAvailableInput.toFixed(6)
                : maxAvailableInput.toFixed(4)}{' '}
              {swapType === 'buy' ? 'SOL' : activeToken.symbol}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setFeedback(null);
            }}
            className="w-full bg-transparent text-xl font-bold font-mono text-white placeholder-slate-600 outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0 bg-[#141b2a] px-2.5 py-1 rounded-lg border border-[#232f48]">
            <span className="text-xs font-bold font-mono text-white">
              {swapType === 'buy' ? 'SOL' : activeToken.symbol}
            </span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#171f30]">
          {swapType === 'buy' ? (
            <>
              <button
                onClick={() => handleFixedSolSelect(0.1)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                0.1 SOL
              </button>
              <button
                onClick={() => handleFixedSolSelect(0.5)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                0.5 SOL
              </button>
              <button
                onClick={() => handleFixedSolSelect(1.0)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                1.0 SOL
              </button>
              <button
                onClick={() => handlePresetSelect(1.0)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-[#14F195] font-bold transition-colors ml-auto"
              >
                MAX
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handlePresetSelect(0.25)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                25%
              </button>
              <button
                onClick={() => handlePresetSelect(0.5)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => handlePresetSelect(0.75)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-slate-300 transition-colors"
              >
                75%
              </button>
              <button
                onClick={() => handlePresetSelect(1.0)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161f30] hover:bg-[#202d44] text-rose-400 font-bold transition-colors ml-auto"
              >
                MAX
              </button>
            </>
          )}
        </div>
      </div>

      {/* Direction Divider */}
      <div className="flex justify-center -my-1 relative z-10">
        <div className="w-7 h-7 rounded-full bg-[#172134] border border-[#283652] flex items-center justify-center text-slate-300 shadow-sm">
          <ArrowDownUp className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Output Box */}
      <div className="bg-[#0b0e14] border border-[#1d263b] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>You Receive (Estimated)</span>
          <span className="text-[11px] font-mono text-slate-500">Constant-Product AMM</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-bold font-mono text-white truncate">
            {quote && quote.outputAmount > 0
              ? quote.outputAmount < 0.0001
                ? quote.outputAmount.toFixed(6)
                : quote.outputAmount.toFixed(4)
              : '0.00'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 bg-[#141b2a] px-2.5 py-1 rounded-lg border border-[#232f48]">
            <span className="text-xs font-bold font-mono text-white">
              {swapType === 'buy' ? activeToken.symbol : 'SOL'}
            </span>
          </div>
        </div>
      </div>

      {/* Quote Breakdown Details */}
      {quote && numericInput > 0 && (
        <div className="bg-[#0e1320] border border-[#1c2438] rounded-xl p-3 mb-3 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span>Execution Rate</span>
            <span className="text-slate-200">
              1 {swapType === 'buy' ? 'SOL' : activeToken.symbol} ≈{' '}
              {swapType === 'buy'
                ? (1 / quote.executionPrice).toFixed(2) + ' ' + activeToken.symbol
                : quote.executionPrice.toFixed(6) + ' SOL'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Price Impact</span>
            <span
              className={`font-semibold ${
                quote.priceImpactPct > 5
                  ? 'text-rose-400'
                  : quote.priceImpactPct > 2
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {quote.priceImpactPct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Minimum Received</span>
            <span className="text-slate-200">
              {quote.minimumReceived.toFixed(4)} {swapType === 'buy' ? activeToken.symbol : 'SOL'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>AMM Fee (0.3%)</span>
            <span className="text-slate-200">{quote.tradingFeeSol.toFixed(5)} SOL</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasInsufficientBalance && (
        <div className="mb-3 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Insufficient balance for this order size.</span>
        </div>
      )}

      {quote?.priceImpactPct && quote.priceImpactPct > 10 && (
        <div className="mb-3 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>High Price Impact! Order is large relative to pool liquidity.</span>
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={() => setIsConfirmModalOpen(true)}
        disabled={
          isInputZeroOrNegative ||
          hasInsufficientBalance ||
          !quote?.isLiquiditySufficient ||
          isSubmitting
        }
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
          swapType === 'buy'
            ? 'bg-[#14F195] hover:bg-[#10d482] text-[#0b0e14] disabled:bg-[#1f2c25] disabled:text-slate-600'
            : 'bg-rose-500 hover:bg-rose-600 text-white disabled:bg-[#2c1f23] disabled:text-slate-600'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : hasInsufficientBalance ? (
          'Insufficient Balance'
        ) : isInputZeroOrNegative ? (
          'Enter an Amount'
        ) : !quote?.isLiquiditySufficient ? (
          'Insufficient Pool Liquidity'
        ) : (
          `${swapType === 'buy' ? 'Buy' : 'Sell'} ${activeToken.symbol}`
        )}
      </button>

      {/* Execution Feedback Notification */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="leading-relaxed">{feedback.message}</p>
            {feedback.signature && (
              <a
                href={getExplorerUrl(feedback.signature, 'tx')}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 underline text-emerald-300 font-mono"
              >
                View on Devnet Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Trade Confirmation Modal */}
      {isConfirmModalOpen && quote && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d] mb-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#14F195]" />
                Confirm Swap Transaction
              </h3>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 mb-4">
              Please review your transaction details before execution:
            </div>

            <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-4 space-y-2.5 text-xs font-mono mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Action:</span>
                <span className={`font-bold uppercase ${swapType === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {swapType} {activeToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Environment:</span>
                <span className="font-bold text-amber-300">
                  {mode === 'practice' ? 'Simulated AMM Playground' : 'Solana Devnet Cluster'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Spending:</span>
                <span className="text-white font-bold">
                  {numericInput} {swapType === 'buy' ? 'SOL' : activeToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Receiving:</span>
                <span className="text-[#14F195] font-bold">
                  {quote.outputAmount.toFixed(4)} {swapType === 'buy' ? activeToken.symbol : 'SOL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Price Impact:</span>
                <span className="text-white">{quote.priceImpactPct.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Min. Received (slippage {slippageTolerance}%):</span>
                <span className="text-white">
                  {quote.minimumReceived.toFixed(4)} {swapType === 'buy' ? activeToken.symbol : 'SOL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fee:</span>
                <span className="text-white">{quote.tradingFeeSol.toFixed(5)} SOL</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedSwap}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#14F195] hover:bg-[#10d482] text-black rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing...</span>
                  </>
                ) : (
                  <span>Confirm & Execute</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
