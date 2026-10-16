import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Droplet,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { getExplorerUrl, shortenAddress } from '../utils/solana';

interface AutoAirdropModalProps {
  onClose: () => void;
}

export const AutoAirdropModal: React.FC<AutoAirdropModalProps> = ({ onClose }) => {
  const wallet = useWallet();
  const {
    devnetSolBalance,
    airdropRecords,
    autoAirdropEnabled,
    setAutoAirdropEnabled,
    executeAirdrop,
    isAirdropping,
    totalAirdroppedSol,
  } = useTrading();

  const walletAddress = wallet.publicKey?.toBase58() || '';

  // Filter airdrops executed for the current account
  const accountRecords = walletAddress
    ? airdropRecords.filter(
        (r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      )
    : airdropRecords;

  const automaticCount = accountRecords.filter((r) => r.type === 'automatic').length;
  const manualCount = accountRecords.filter((r) => r.type === 'manual').length;

  const handleManualAirdrop = async () => {
    await executeAirdrop(1, false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1b2336] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#14F195]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Devnet Airdrop Manager
              </h2>
              <p className="text-xs text-slate-400">
                Permanent automatic Devnet SOL airdrops & execution history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Account Info Bar */}
        <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400 font-mono">Current Account:</span>
              <span className="text-xs font-bold text-white font-mono">
                {walletAddress ? shortenAddress(walletAddress, 6) : 'No Wallet Connected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Balance:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {devnetSolBalance.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Permanent Automatic Airdrop Toggle Card */}
        <div className="bg-[#0d1320] border border-[#202e48] rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Permanent Automatic Devnet Airdrop
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-semibold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically requests and credits +1.0 Devnet SOL whenever this account's balance falls below 1.0 SOL. Keeps your wallet permanently funded for continuous meme coin testing.
              </p>
            </div>

            {/* Switch Toggle */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={autoAirdropEnabled}
                onChange={(e) => setAutoAirdropEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14F195]"></div>
            </label>
          </div>
        </div>

        {/* Account Execution Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 font-mono text-center">
          <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1b2336]">
            <span className="text-[10px] text-slate-500 block">Total Airdropped</span>
            <span className="text-sm font-extrabold text-[#14F195] mt-0.5 block">
              {totalAirdroppedSol.toFixed(1)} SOL
            </span>
          </div>
          <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1b2336]">
            <span className="text-[10px] text-slate-500 block">Automatic Executions</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">
              {automaticCount}
            </span>
          </div>
          <div className="bg-[#0b0e14] p-2.5 rounded-xl border border-[#1b2336]">
            <span className="text-[10px] text-slate-500 block">Manual Requests</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">
              {manualCount}
            </span>
          </div>
        </div>

        {/* Action Button: Manual Airdrop */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            SOL Airdrops Executed History ({accountRecords.length})
          </span>
          <button
            onClick={handleManualAirdrop}
            disabled={isAirdropping || !wallet.publicKey}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#14F195] hover:bg-[#10d482] text-black px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAirdropping ? 'animate-spin' : ''}`} />
            <span>{isAirdropping ? 'Executing...' : 'Request +1 SOL Now'}</span>
          </button>
        </div>

        {/* Airdrops Executed Ledger Table */}
        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
          {accountRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1b2336] rounded-xl">
              <Droplet className="w-5 h-5 mx-auto text-slate-600 mb-1.5" />
              <p>No Devnet SOL airdrops executed yet for this account.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Automatic airdrops will be logged here with on-chain signatures.
              </p>
            </div>
          ) : (
            accountRecords.map((item) => {
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="bg-[#0b0e14] border border-[#1a2336] rounded-xl p-3 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    {item.status === 'confirmed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          +{item.solAmount.toFixed(1)} SOL
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            item.type === 'automatic'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-purple-950 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {dateStr} • Account: {shortenAddress(item.walletAddress, 4)}
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.signature ? (
                      <a
                        href={getExplorerUrl(item.signature, 'tx')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#14F195] hover:underline text-[11px]"
                      >
                        <span>{shortenAddress(item.signature, 4)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-rose-400 text-[10px]">
                        {item.error || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-[#1b2336] flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Solana Devnet Testnet Funds Only</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#182338] text-white hover:bg-[#23314e] font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
