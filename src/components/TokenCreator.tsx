import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Rocket,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Copy,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { createDevnetSplToken, getExplorerUrl, shortenAddress } from '../utils/solana';
import { Token } from '../types';
import confetti from 'canvas-confetti';

interface TokenCreatorProps {
  onClose: () => void;
}

export const TokenCreator: React.FC<TokenCreatorProps> = ({ onClose }) => {
  const { mode, addCustomToken, devnetSolBalance } = useTrading();
  const wallet = useWallet();
  const { connection } = useConnection();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState<number>(6);
  const [initialSupply, setInitialSupply] = useState<string>('1000000');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#14F195');

  // Option to seed immediate practice AMM pool
  const [seedPracticePool, setSeedPracticePool] = useState(true);
  const [seedSolLiquidity, setSeedSolLiquidity] = useState<string>('25');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    mintAddress?: string;
    signature?: string;
    explorerUrl?: string;
    error?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;

    setIsSubmitting(true);
    setResult(null);

    const supplyNum = parseFloat(initialSupply) || 0;
    const cleanSymbol = symbol.trim().toUpperCase();

    if (mode === 'devnet') {
      if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
        setIsSubmitting(false);
        setResult({
          success: false,
          error: 'Please connect your Solana wallet (e.g. Phantom) configured for Devnet.',
        });
        return;
      }

      if (devnetSolBalance < 0.05) {
        setIsSubmitting(false);
        setResult({
          success: false,
          error:
            'Insufficient Devnet SOL to pay for mint account rent exemption & fees (~0.05 SOL needed). Use the Devnet Faucet in the top bar.',
        });
        return;
      }

      // Execute on-chain Devnet SPL token mint creation
      const res = await createDevnetSplToken(
        connection,
        wallet.publicKey,
        wallet.sendTransaction,
        {
          decimals,
          initialSupply: supplyNum,
        }
      );

      setIsSubmitting(false);
      setResult(res);

      if (res.success && res.mintAddress) {
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });

        // Register custom token in playground
        const customToken: Token = {
          id: 'devnet_' + res.mintAddress.slice(0, 8),
          name: name.trim(),
          symbol: cleanSymbol,
          mintAddress: res.mintAddress,
          decimals,
          color,
          description: description || `Custom Devnet SPL Token created by ${shortenAddress(wallet.publicKey.toBase58())}`,
          isSimulated: false,
          basePriceSol: 0.0001,
          priceChange24h: 0,
          volume24hSol: 0,
          marketCapSol: supplyNum * 0.0001,
          initialSolReserve: parseFloat(seedSolLiquidity) || 20,
          initialTokenReserve: supplyNum > 0 ? supplyNum * 0.5 : 500000,
        };

        if (seedPracticePool) {
          addCustomToken(
            customToken,
            parseFloat(seedSolLiquidity) || 20,
            supplyNum > 0 ? supplyNum * 0.5 : 500000
          );
        }
      }
    } else {
      // Practice Mode Simulated Launch
      setTimeout(() => {
        setIsSubmitting(false);
        const mockMint = 'SimMint' + Math.random().toString(36).substring(2, 10).toUpperCase() + '11111111111111111';
        
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

        const customToken: Token = {
          id: 'sim_' + Date.now(),
          name: name.trim(),
          symbol: cleanSymbol,
          mintAddress: mockMint,
          decimals,
          color,
          description: description || 'Simulated meme token launched in playground.',
          isSimulated: true,
          basePriceSol: (parseFloat(seedSolLiquidity) || 20) / (supplyNum * 0.5 || 500000),
          priceChange24h: 0,
          volume24hSol: 0,
          marketCapSol: supplyNum * 0.0001,
          initialSolReserve: parseFloat(seedSolLiquidity) || 20,
          initialTokenReserve: supplyNum > 0 ? supplyNum * 0.5 : 500000,
        };

        addCustomToken(
          customToken,
          parseFloat(seedSolLiquidity) || 20,
          supplyNum > 0 ? supplyNum * 0.5 : 500000
        );

        setResult({
          success: true,
          mintAddress: mockMint,
        });
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1b2336] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9945FF] to-[#14F195] p-0.5">
              <div className="w-full h-full bg-[#0b0e14] rounded-[6px] flex items-center justify-center">
                <Rocket className="w-4 h-4 text-[#14F195]" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'devnet' ? 'Devnet SPL Token Mint Creator' : 'Simulated Meme Token Launcher'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'devnet'
                  ? 'Creates a real SPL token mint on Solana Devnet via web3.js & SPL Token program'
                  : 'Instantly spawn a custom meme token with virtual AMM liquidity'}
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

        {/* Education & Safety Warning */}
        <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex items-start gap-2 text-amber-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">Important Solana Architecture Note:</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                Creating an SPL token mint creates the currency supply on-chain. It does <strong>not automatically create an AMM trading pool</strong>. A token only becomes swappable once liquidity is deposited into a constant-product pool (e.g. Raydium, Orca, or our Playground AMM).
              </p>
            </div>
          </div>
          <div className="text-slate-400 text-[11px] pl-6 border-t border-[#171f30] pt-2">
            Metaplex Token Metadata: On raw Devnet mints, standard SPL tokens are initialized first. Off-chain URI metadata is managed through the Metaplex standard.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Token Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Devnet Shib"
                className="w-full bg-[#0b0e14] border border-[#232f48] focus:border-[#14F195] px-3 py-2 rounded-lg text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Symbol *
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. DSHIB"
                className="w-full bg-[#0b0e14] border border-[#232f48] focus:border-[#14F195] px-3 py-2 rounded-lg text-sm text-white font-mono uppercase outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Decimals
              </label>
              <select
                value={decimals}
                onChange={(e) => setDecimals(parseInt(e.target.value))}
                className="w-full bg-[#0b0e14] border border-[#232f48] focus:border-[#14F195] px-3 py-2 rounded-lg text-sm text-white outline-none"
              >
                <option value={6}>6 Decimals (Standard SPL meme)</option>
                <option value={9}>9 Decimals (Solana Native)</option>
                <option value={2}>2 Decimals (Fiat style)</option>
                <option value={0}>0 Decimals (NFT style)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Initial Supply
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                placeholder="1000000"
                className="w-full bg-[#0b0e14] border border-[#232f48] focus:border-[#14F195] px-3 py-2 rounded-lg text-sm text-white font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this meme token special?"
              className="w-full bg-[#0b0e14] border border-[#232f48] focus:border-[#14F195] px-3 py-2 rounded-lg text-xs text-white outline-none resize-none"
            />
          </div>

          {/* Color theme picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Badge Color
            </label>
            <div className="flex items-center gap-2">
              {['#14F195', '#9945FF', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444'].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Seed playground liquidity */}
          <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white mb-2">
              <input
                type="checkbox"
                checked={seedPracticePool}
                onChange={(e) => setSeedPracticePool(e.target.checked)}
                className="rounded accent-[#14F195]"
              />
              <span>Initialize Playground AMM Liquidity Pool</span>
            </label>
            {seedPracticePool && (
              <div className="pl-6 text-xs space-y-2">
                <p className="text-slate-400 text-[11px]">
                  Deposit virtual SOL and 50% of supply into a constant-product pool so you can immediately practice buying and selling this token.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Virtual SOL Liquidity:</span>
                  <input
                    type="number"
                    min="1"
                    value={seedSolLiquidity}
                    onChange={(e) => setSeedSolLiquidity(e.target.value)}
                    className="w-24 bg-[#141b2a] border border-[#232f48] px-2 py-1 rounded text-white font-mono text-xs"
                  />
                  <span className="text-slate-400 text-[11px]">SOL</span>
                </div>
              </div>
            )}
          </div>

          {/* Result Banner */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                result.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {result.success
                    ? mode === 'devnet'
                      ? 'SPL Token Mint Created on Devnet!'
                      : 'Simulated Token Created!'
                    : 'Creation Failed'}
                </span>
              </div>

              {result.mintAddress && (
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Mint Address:</span>
                    <span className="text-white font-bold">{shortenAddress(result.mintAddress, 8)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(result.mintAddress!)}
                      className="text-slate-400 hover:text-white"
                      title="Copy Mint"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copied && <span className="text-[#14F195] text-[9px]">Copied!</span>}
                  </div>
                  {result.signature && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Transaction:</span>
                      <a
                        href={getExplorerUrl(result.signature, 'tx')}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-emerald-300 hover:text-emerald-100 flex items-center gap-1"
                      >
                        {shortenAddress(result.signature, 6)} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {result.error && <p className="text-rose-300 text-xs">{result.error}</p>}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b2336]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !symbol}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#14F195] hover:bg-[#10d482] text-black transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {mode === 'devnet' ? 'Awaiting Wallet Signature...' : 'Deploying...'}
                  </span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  <span>
                    {mode === 'devnet' ? 'Sign & Deploy to Devnet' : 'Launch in Playground'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
