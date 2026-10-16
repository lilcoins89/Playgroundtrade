import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  ShieldAlert,
  Flame,
  PlusCircle,
  FlaskConical,
  RotateCcw,
  Droplet,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Radio,
  Zap,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { getExplorerUrl, shortenAddress } from '../utils/solana';
import { useConnection } from '@solana/wallet-adapter-react';

interface HeaderProps {
  onOpenCreator: () => void;
  onOpenTests: () => void;
  onOpenGuide: () => void;
  onOpenAirdrop: () => void;
  onOpenWorkspace: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreator,
  onOpenTests,
  onOpenGuide,
  onOpenAirdrop,
  onOpenWorkspace,
}) => {
  const {
    mode,
    setMode,
    practiceSol,
    initialPracticeSol,
    resetPracticeAccount,
    devnetSolBalance,
    devnetStatus,
    refreshDevnetData,
    isDevnetRefreshing,
    executeAirdrop,
    totalAirdroppedSol,
    autoAirdropEnabled,
    autoAirdropNotice,
    clearAutoAirdropNotice,
  } = useTrading();

  const { connection } = useConnection();
  const wallet = useWallet();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [customResetSol, setCustomResetSol] = useState(initialPracticeSol.toString());
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [airdropMsg, setAirdropMsg] = useState<{ type: 'success' | 'error'; text: string; tx?: string } | null>(null);

  const handleAirdrop = async () => {
    if (!wallet.publicKey) {
      setAirdropMsg({ type: 'error', text: 'Please connect your Devnet wallet first' });
      return;
    }
    setIsAirdropping(true);
    setAirdropMsg(null);
    try {
      const res = await executeAirdrop(1, false);
      if (res.success && res.signature) {
        setAirdropMsg({
          type: 'success',
          text: 'Success! 1 Devnet SOL airdropped on-chain.',
          tx: res.signature,
        });
      } else {
        setAirdropMsg({
          type: 'error',
          text: res.error || 'Airdrop rate limit reached. Try again or check faucet.solana.com',
        });
      }
    } catch (err: any) {
      setAirdropMsg({ type: 'error', text: err?.message || 'Airdrop request failed' });
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleResetConfirm = () => {
    const amount = parseFloat(customResetSol);
    if (!isNaN(amount) && amount > 0) {
      resetPracticeAccount(amount);
      setIsResetModalOpen(false);
    }
  };

  return (
    <header className="border-b border-[#1b2234] bg-[#0d111a]/95 backdrop-blur-md sticky top-0 z-40">
      {/* Required Persistent Safety Banners */}
      {mode === 'practice' ? (
        <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-amber-950/80 border-b border-amber-500/30 px-4 py-1.5 text-center text-xs text-amber-200 font-mono tracking-wide flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold">SIMULATION — NO REAL FUNDS</span>
          <span className="hidden sm:inline text-amber-400/80">| Constant-product AMM simulator with virtual SOL</span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-emerald-950/80 border-b border-emerald-500/30 px-4 py-1.5 text-center text-xs text-emerald-200 font-mono tracking-wide flex items-center justify-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold">SOLANA DEVNET — TEST FUNDS ONLY</span>
          <span className="hidden sm:inline text-emerald-400/80">
            | 🟢 Live Devnet Stream: Slot #{devnetStatus.slot ? devnetStatus.slot.toLocaleString() : '...'} • Block #{devnetStatus.blockHeight ? devnetStatus.blockHeight.toLocaleString() : '...'} {devnetStatus.pingMs > 0 ? `• ${devnetStatus.pingMs}ms` : ''} • WebSocket Sync Active
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9945FF] to-[#14F195] p-0.5 shadow-lg shadow-purple-500/10">
              <div className="w-full h-full bg-[#0b0e14] rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#14F195]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">SOLMEME</span>
                <span className="text-[10px] font-mono font-bold bg-[#1e2738] text-[#14F195] px-1.5 py-0.5 rounded border border-[#2e3c56]">
                  PLAYGROUND
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Solana Meme Trading Simulator</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#111624] p-1 rounded-lg border border-[#1e273a] ml-2 sm:ml-4">
            <button
              onClick={() => setMode('practice')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                mode === 'practice'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Practice Mode
            </button>
            <button
              onClick={() => setMode('devnet')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                mode === 'devnet'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Devnet Mode
            </button>
          </div>
        </div>

        {/* Quick Actions & Wallet */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Practice Mode Controls */}
          {mode === 'practice' ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-[#141b2a] border border-[#232f48] px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="text-slate-400">Virtual SOL:</span>
                <span className="font-bold text-amber-300">{practiceSol.toFixed(4)} SOL</span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#161e30] hover:bg-[#1f2b44] px-2.5 py-1.5 rounded-lg border border-[#243350] transition-colors"
                title="Configure virtual balance or reset"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Reset / Balance</span>
              </button>
            </div>
          ) : (
            /* Devnet Mode Controls */
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-[#122320] border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="text-emerald-400/80">Devnet SOL:</span>
                <span className="font-bold text-emerald-300">{devnetSolBalance.toFixed(4)} SOL</span>
              </div>
              <button
                onClick={onOpenAirdrop}
                className="flex items-center gap-1.5 text-xs text-[#14F195] bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
                title="Permanent Automatic Devnet Airdrop & Execution Ledger"
              >
                <Zap className="w-3.5 h-3.5 text-[#14F195] animate-pulse" />
                <span className="hidden sm:inline">Auto-Airdrop:</span>
                <span className="font-bold font-mono">
                  {totalAirdroppedSol > 0 ? `${totalAirdroppedSol} SOL` : 'Active'}
                </span>
              </button>
              {wallet.connected && (
                <button
                  onClick={handleAirdrop}
                  disabled={isAirdropping}
                  className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                  title="Request 1 Devnet SOL from faucet"
                >
                  <Droplet className={`w-3.5 h-3.5 text-emerald-400 ${isAirdropping ? 'animate-bounce' : ''}`} />
                  <span>{isAirdropping ? 'Airdropping...' : '+1 Faucet'}</span>
                </button>
              )}
            </div>
          )}

          {/* Solana Playground-inspired browser workspace */}
          <button
            onClick={onOpenWorkspace}
            className="flex items-center gap-1.5 text-xs text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/30 px-3 py-1.5 rounded-lg transition-all font-semibold"
            title="Open the browser-based Solana program workspace"
          >
            <Flame className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Program Lab</span>
          </button>

          {/* Token Creator Trigger */}
          <button
            onClick={onOpenCreator}
            className="flex items-center gap-1.5 text-xs text-[#14F195] bg-[#14F195]/10 hover:bg-[#14F195]/20 border border-[#14F195]/30 px-3 py-1.5 rounded-lg transition-all font-semibold"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Launch Token</span>
          </button>

          {/* Test Suite Trigger */}
          <button
            onClick={onOpenTests}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#161e30] hover:bg-[#1f2b44] border border-[#232f48] px-2.5 py-1.5 rounded-lg transition-colors"
            title="Run AMM & P&L Math Unit Tests"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Math Tests</span>
          </button>

          {/* Guide Modal Trigger */}
          <button
            onClick={onOpenGuide}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#161e30] border border-[#232f48] rounded-lg transition-colors"
            title="How it works"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Wallet MultiButton */}
          <div className="wallet-button-container">
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Automatic Airdrop Global Notification */}
      {autoAirdropNotice && (
        <div className="px-4 py-2 text-xs flex items-center justify-between border-t bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-md">
          <div className="flex items-center gap-2 max-w-3xl truncate">
            <Zap className="w-4 h-4 text-[#14F195] shrink-0 animate-bounce" />
            <span className="font-semibold">{autoAirdropNotice.message}</span>
            {autoAirdropNotice.signature && (
              <a
                href={getExplorerUrl(autoAirdropNotice.signature, 'tx')}
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100 font-mono ml-2"
              >
                View on Devnet Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={clearAutoAirdropNotice}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual Airdrop feedback notification */}
      {airdropMsg && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-t ${
            airdropMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 max-w-2xl truncate">
            {airdropMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{airdropMsg.text}</span>
            {airdropMsg.tx && (
              <a
                href={getExplorerUrl(airdropMsg.tx, 'tx')}
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100 font-mono"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setAirdropMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Practice Balance Config Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Configure Practice Account
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Customize your virtual SOL starting balance or reset all trades, positions, and pools back to factory conditions.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Virtual SOL Balance
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={customResetSol}
                    onChange={(e) => setCustomResetSol(e.target.value)}
                    className="flex-1 bg-[#0b0e14] border border-[#232f48] focus:border-amber-400 px-3 py-2 rounded-lg text-sm text-white font-mono outline-none"
                    placeholder="10.0"
                  />
                  <button
                    onClick={() => setCustomResetSol('10')}
                    className="px-2.5 py-1 text-xs bg-[#192236] hover:bg-[#232f48] rounded-lg text-slate-300"
                  >
                    10 SOL
                  </button>
                  <button
                    onClick={() => setCustomResetSol('50')}
                    className="px-2.5 py-1 text-xs bg-[#192236] hover:bg-[#232f48] rounded-lg text-slate-300"
                  >
                    50 SOL
                  </button>
                  <button
                    onClick={() => setCustomResetSol('100')}
                    className="px-2.5 py-1 text-xs bg-[#192236] hover:bg-[#232f48] rounded-lg text-slate-300"
                  >
                    100 SOL
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e273a] flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    resetPracticeAccount(10);
                    setIsResetModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-colors"
                >
                  Factory Reset
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetConfirm}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
                  >
                    Apply Balance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
