import React from 'react';
import {
  HelpCircle,
  Shield,
  Droplet,
  Wallet,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface DevnetGuideModalProps {
  onClose: () => void;
}

export const DevnetGuideModal: React.FC<DevnetGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1b2336] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Solana Devnet & Practice Guide
              </h2>
              <p className="text-xs text-slate-400">
                Safe learning environment for meme coin trading and token creation
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

        {/* Content sections */}
        <div className="space-y-4 text-xs text-slate-300">
          {/* Section 1: Practice vs Devnet */}
          <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#14F195]" />
              Two Distinct Operating Modes
            </h4>
            <div className="space-y-1.5 text-[11px] leading-relaxed">
              <p>
                <strong className="text-amber-400">Practice Mode (Default):</strong>{' '}
                Instant simulated trading without needing a wallet, faucet SOL, or external network calls. Uses a real Constant-Product AMM model (x * y = k) with virtual liquidity, realistic price impact, slippage, and weighted-average cost basis P&L tracking.
              </p>
              <p>
                <strong className="text-emerald-400">Devnet Mode:</strong> Connects to the real Solana Devnet cluster via Solana Wallet Adapter. Allows inspecting live Devnet balances, requesting test SOL from the Devnet faucet, and minting genuine SPL tokens on-chain.
              </p>
            </div>
          </div>

          {/* Section 2: Getting Devnet SOL */}
          <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Droplet className="w-4 h-4 text-emerald-400" />
              Getting Free Devnet SOL
            </h4>
            <p className="text-[11px] leading-relaxed">
              Devnet SOL has no real-world monetary value and is free for developers. In Devnet Mode:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-400">
              <li>Connect your Phantom or Solflare wallet.</li>
              <li>Click the <strong className="text-white">"Devnet Faucet"</strong> button in the top navigation bar.</li>
              <li>Or visit the official Solana faucet at{' '}
                <a
                  href="https://faucet.solana.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-emerald-300 inline-flex items-center gap-0.5"
                >
                  faucet.solana.com <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
            </ol>
          </div>

          {/* Section 3: Setting Phantom to Devnet */}
          <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" />
              Setting Phantom Wallet to Devnet
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-400">
              <li>Open Phantom extension.</li>
              <li>Click the gear icon (Settings) in the bottom right corner.</li>
              <li>Scroll down to <strong className="text-white">"Developer Settings"</strong>.</li>
              <li>Enable <strong className="text-white">"Testnet Mode"</strong> and select <strong className="text-white">"Solana Devnet"</strong>.</li>
            </ol>
          </div>

          {/* Section 4: Strict Security Rules */}
          <div className="bg-[#0b0e14] border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
            <h4 className="font-bold text-amber-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Security & Verification Rules
            </h4>
            <ul className="space-y-1 text-[11px] text-slate-400 list-disc pl-4">
              <li>This application <strong className="text-white">never</strong> asks for, collects, or stores seed phrases or private keys.</li>
              <li>Wallet signatures are only requested when you explicitly submit a transaction.</li>
              <li>This playground will <strong className="text-white">never</strong> silently switch to Solana Mainnet.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#1b2336] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#14F195] hover:bg-[#10d482] text-black transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
