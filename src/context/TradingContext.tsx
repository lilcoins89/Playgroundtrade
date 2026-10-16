import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  AppMode,
  Token,
  AMMPool,
  Position,
  Trade,
  SwapQuote,
  PortfolioSummary,
  CandlestickData,
  PortfolioSnapshot,
  DailyPnLEntry,
} from '../types';
import {
  calculateBuyQuote,
  calculateSellQuote,
  executeSwapOnPool,
  getSpotPrice,
} from '../utils/amm';
import {
  recordBuyInPosition,
  recordSellInPosition,
  calculatePortfolioSummary,
} from '../utils/pnl';
import {
  loadPracticeBalance,
  savePracticeBalance,
  loadTokens,
  saveTokens,
  loadPools,
  savePools,
  loadPositions,
  savePositions,
  loadTrades,
  saveTrades,
  resetAllPracticeData,
  generateCandlestickHistory,
  loadPortfolioSnapshots,
  savePortfolioSnapshots,
  generateInitialPortfolioSnapshots,
  calculateDailyPnLEntries,
  loadAirdropRecords,
  saveAirdropRecord,
  loadAutoAirdropEnabled,
  saveAutoAirdropEnabled,
  INITIAL_PRACTICE_SOL,
} from '../utils/storage';
import {
  fetchDevnetSolBalance,
  getDevnetClusterStatus,
  fetchDevnetSplTokenBalance,
  executeDevnetSwapOnChain,
  fetchDevnetWalletTokens,
  requestDevnetAirdrop,
  toSafePublicKey,
} from '../utils/solana';
import { AirdropRecord } from '../types';
import { recordMarketSnapshotToSupabase, recordTradeToSupabase, subscribeToMarketData, syncTokensToSupabase, supabase } from '../utils/supabase';

interface TradingContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  tokens: Token[];
  activeToken: Token;
  setActiveToken: (token: Token) => void;
  pools: Record<string, AMMPool>;
  positions: Position[];
  trades: Trade[];
  practiceSol: number;
  initialPracticeSol: number;
  portfolioSummary: PortfolioSummary;
  portfolioSnapshots: PortfolioSnapshot[];
  dailyPnLEntries: DailyPnLEntry[];
  slippageTolerance: number;
  setSlippageTolerance: (val: number) => void;
  candlesticks: Record<string, CandlestickData[]>;
  devnetSolBalance: number;
  devnetTokenBalance: number;
  devnetStatus: { slot: number; blockHeight: number; isHealthy: boolean; pingMs: number };
  isDevnetRefreshing: boolean;
  refreshDevnetData: () => Promise<void>;
  executePracticeSwap: (quote: SwapQuote) => { success: boolean; error?: string };
  executeDevnetSwap: (quote: SwapQuote) => Promise<{ success: boolean; signature?: string; explorerUrl?: string; error?: string }>;
  resetPracticeAccount: (newInitialSol?: number) => void;
  addCustomToken: (token: Token, initialSolReserve?: number, initialTokenReserve?: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  airdropRecords: AirdropRecord[];
  autoAirdropEnabled: boolean;
  setAutoAirdropEnabled: (enabled: boolean) => void;
  executeAirdrop: (solAmount?: number, isAuto?: boolean) => Promise<{ success: boolean; signature?: string; error?: string }>;
  isAirdropping: boolean;
  totalAirdroppedSol: number;
  autoAirdropNotice: { message: string; signature?: string; timestamp: number } | null;
  clearAutoAirdropNotice: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Requirement: Default to Practice Mode on first launch
  const [mode, setMode] = useState<AppMode>('practice');

  const [tokens, setTokens] = useState<Token[]>(() => loadTokens());
  const [activeToken, setActiveToken] = useState<Token>(() => tokens[0]);
  const [pools, setPools] = useState<Record<string, AMMPool>>(() => loadPools(tokens));
  const [positions, setPositions] = useState<Position[]>(() => loadPositions());
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());

  const balanceData = loadPracticeBalance();
  const [practiceSol, setPracticeSol] = useState<number>(balanceData.current);
  const [initialPracticeSol, setInitialPracticeSol] = useState<number>(balanceData.initial);
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>(() =>
    loadPortfolioSnapshots(balanceData.initial)
  );
  const [slippageTolerance, setSlippageTolerance] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const dailyPnLEntries = useMemo(() => {
    return calculateDailyPnLEntries(portfolioSnapshots, trades);
  }, [portfolioSnapshots, trades]);

  // Candlestick history for each token
  const [candlesticks, setCandlesticks] = useState<Record<string, CandlestickData[]>>(() => {
    const initial: Record<string, CandlestickData[]> = {};
    for (const t of tokens) {
      initial[t.id] = generateCandlestickHistory(t.basePriceSol);
    }
    return initial;
  });

  // Devnet live wallet integration
  const { connection } = useConnection();
  const wallet = useWallet();
  const [devnetSolBalance, setDevnetSolBalance] = useState<number>(0);
  const [devnetTokenBalance, setDevnetTokenBalance] = useState<number>(0);
  const [devnetStatus, setDevnetStatus] = useState({ slot: 0, blockHeight: 0, isHealthy: false, pingMs: 0 });
  const [isDevnetRefreshing, setIsDevnetRefreshing] = useState(false);

  // Permanent Automatic Airdrop state & ledger
  const [autoAirdropEnabled, setAutoAirdropEnabledState] = useState<boolean>(() => loadAutoAirdropEnabled());
  const [airdropRecords, setAirdropRecords] = useState<AirdropRecord[]>(() => loadAirdropRecords());
  const [isAirdropping, setIsAirdropping] = useState<boolean>(false);
  const [autoAirdropNotice, setAutoAirdropNotice] = useState<{ message: string; signature?: string; timestamp: number } | null>(null);
  const autoAirdropAttemptedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    void syncTokensToSupabase(tokens);
    if (!supabase) return;
    let cancelled = false;
    void supabase.from('tokens').select('id,symbol,name,mint_address,logo_url,description,decimals,base_price_sol,market_cap_sol').then(({ data, error }) => {
      if (cancelled || error || !data?.length) return;
      setTokens((current) => current.map((token) => {
        const remote = data.find((item) => item.id === token.id);
        return remote ? { ...token, name: remote.name, symbol: remote.symbol, mintAddress: remote.mint_address ?? token.mintAddress, iconUrl: remote.logo_url ?? token.iconUrl, description: remote.description ?? token.description, decimals: remote.decimals ?? token.decimals, basePriceSol: Number(remote.base_price_sol ?? token.basePriceSol), marketCapSol: Number(remote.market_cap_sol ?? token.marketCapSol) } : token;
      }));
    });
    const unsubscribe = subscribeToMarketData(() => { void syncTokensToSupabase(tokens); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // Sync token spot prices with active AMM pools
  const tokenPricesMap: Record<string, number> = {};
  for (const t of tokens) {
    const pool = pools[t.id];
    if (pool) {
      tokenPricesMap[t.id] = getSpotPrice(pool.solReserve, pool.tokenReserve);
    } else {
      tokenPricesMap[t.id] = t.basePriceSol;
    }
  }

  // Calculate current overall portfolio summary
  const portfolioSummary = calculatePortfolioSummary(
    practiceSol,
    initialPracticeSol,
    positions,
    tokenPricesMap
  );

  // Refresh Devnet balance, token holdings, and cluster status with live latency ping
  const refreshDevnetData = useCallback(async () => {
    if (!connection) return;
    setIsDevnetRefreshing(true);
    try {
      const startPing = performance.now();
      const status = await getDevnetClusterStatus(connection);
      const endPing = performance.now();
      const pingMs = Math.round(endPing - startPing);
      setDevnetStatus({ ...status, pingMs });

      if (wallet.publicKey) {
        const solBal = await fetchDevnetSolBalance(connection, wallet.publicKey);
        setDevnetSolBalance(solBal);

        if (activeToken.mintAddress) {
          const mintKey = toSafePublicKey(activeToken.mintAddress);
          if (mintKey) {
            try {
              const tokBal = await fetchDevnetSplTokenBalance(
                connection,
                wallet.publicKey,
                mintKey
              );
              setDevnetTokenBalance(tokBal);
            } catch {
              setDevnetTokenBalance(0);
            }
          } else {
            setDevnetTokenBalance(0);
          }
        }

        // Parse all on-chain tokens in user wallet
        try {
          const onChainTokens = await fetchDevnetWalletTokens(connection, wallet.publicKey);
          if (onChainTokens.length > 0 && mode === 'devnet') {
            setPositions((prev) => {
              const updated = [...prev];
              for (const wt of onChainTokens) {
                const knownToken = tokens.find((t) => t.mintAddress === wt.mint);
                if (knownToken && wt.balance > 0) {
                  const idx = updated.findIndex((p) => p.tokenId === knownToken.id);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      tokenAmount: wt.balance,
                      lastUpdated: Date.now(),
                    };
                  } else {
                    updated.push({
                      tokenId: knownToken.id,
                      tokenSymbol: knownToken.symbol,
                      tokenName: knownToken.name,
                      mintAddress: knownToken.mintAddress,
                      tokenAmount: wt.balance,
                      totalCostSol: wt.balance * knownToken.basePriceSol,
                      averageEntryPriceSol: knownToken.basePriceSol,
                      realizedPnLSol: 0,
                      lastUpdated: Date.now(),
                    });
                  }
                }
              }
              return updated;
            });
          }
        } catch (err) {
          console.warn('Failed to parse on-chain wallet tokens:', err);
        }
      } else {
        setDevnetSolBalance(0);
        setDevnetTokenBalance(0);
      }
    } catch (err) {
      console.warn('Devnet refresh error:', err);
    } finally {
      setIsDevnetRefreshing(false);
    }
  }, [connection, wallet.publicKey, activeToken, mode, tokens]);

  // Real-time WebSocket account subscription for connected wallet on Devnet
  useEffect(() => {
    if (!connection || !wallet.publicKey) return;

    let subId: number | null = null;
    try {
      subId = connection.onAccountChange(
        wallet.publicKey,
        (accountInfo) => {
          const sol = accountInfo.lamports / 1000000000;
          setDevnetSolBalance(sol);
        },
        'confirmed'
      );
    } catch (err) {
      console.warn('Devnet WebSocket account subscription error:', err);
    }

    return () => {
      if (subId !== null) {
        try {
          connection.removeAccountChangeListener(subId);
        } catch {
          // ignore
        }
      }
    };
  }, [connection, wallet.publicKey]);

  // Real-time live polling of Devnet cluster health and ping every 3 seconds
  useEffect(() => {
    refreshDevnetData();
    const interval = setInterval(refreshDevnetData, 3000);
    return () => clearInterval(interval);
  }, [refreshDevnetData]);

  const setAutoAirdropEnabled = (enabled: boolean) => {
    setAutoAirdropEnabledState(enabled);
    saveAutoAirdropEnabled(enabled);
  };

  const clearAutoAirdropNotice = () => {
    setAutoAirdropNotice(null);
  };

  const executeAirdrop = async (
    solAmount: number = 1,
    isAuto: boolean = false
  ): Promise<{ success: boolean; signature?: string; error?: string }> => {
    if (!wallet.publicKey || !connection) {
      return { success: false, error: 'Connect your wallet on Devnet to request test SOL.' };
    }
    const walletAddress = wallet.publicKey.toBase58();
    setIsAirdropping(true);

    try {
      const res = await requestDevnetAirdrop(connection, wallet.publicKey, solAmount);
      const record: AirdropRecord = {
        id: 'airdrop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        walletAddress,
        solAmount,
        signature: res.signature,
        timestamp: Date.now(),
        type: isAuto ? 'automatic' : 'manual',
        status: res.success ? 'confirmed' : 'failed',
        error: res.error,
      };

      saveAirdropRecord(record);
      setAirdropRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);

      if (res.success && res.signature) {
        if (isAuto) {
          setAutoAirdropNotice({
            message: `⚡ Permanent Auto-Airdrop: +${solAmount} Devnet SOL automatically deposited!`,
            signature: res.signature,
            timestamp: Date.now(),
          });
        }
        await refreshDevnetData();
      }

      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Airdrop request failed' };
    } finally {
      setIsAirdropping(false);
    }
  };

  // Calculate total confirmed airdrops for the connected account
  const totalAirdroppedSol = useMemo(() => {
    const relevant = wallet.publicKey
      ? airdropRecords.filter(
          (r) =>
            r.walletAddress.toLowerCase() === wallet.publicKey?.toBase58().toLowerCase() &&
            r.status === 'confirmed'
        )
      : airdropRecords.filter((r) => r.status === 'confirmed');
    return relevant.reduce((acc, r) => acc + r.solAmount, 0);
  }, [airdropRecords, wallet.publicKey]);

  // Permanent Automatic Devnet Airdrop monitor:
  // Automatically carries along a persistent Devnet SOL airdrop whenever an account connects with low or zero testnet funds!
  useEffect(() => {
    if (mode !== 'devnet' || !wallet.publicKey || !autoAirdropEnabled || !connection) return;

    const walletAddress = wallet.publicKey.toBase58();
    const lastAttemptTime = autoAirdropAttemptedRef.current[walletAddress] || 0;
    const now = Date.now();

    // 40-second throttle per account to prevent RPC rate limiting
    if (now - lastAttemptTime < 40000) return;

    // Trigger auto-airdrop if user's devnet SOL balance is low (< 1.0 SOL)
    if (devnetSolBalance < 1.0 && !isAirdropping) {
      autoAirdropAttemptedRef.current[walletAddress] = now;
      executeAirdrop(1, true);
    }
  }, [mode, wallet.publicKey, devnetSolBalance, autoAirdropEnabled, connection, isAirdropping]);

  // Gentle simulated price heartbeat in Practice Mode to give alive trading terminal feel
  useEffect(() => {
    if (mode !== 'practice') return;

    const interval = setInterval(() => {
      // Pick a random token to simulate small market tick
      const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
      if (!randomToken) return;

      const deltaPercent = (Math.random() - 0.49) * 0.008; // +/- 0.4%
      setPools((prevPools) => {
        const currentPool = prevPools[randomToken.id];
        if (!currentPool) return prevPools;

        // Micro-shift token reserve
        const newSolReserve = currentPool.solReserve * (1 + deltaPercent * 0.5);
        const newTokenReserve = currentPool.k / newSolReserve;

        return {
          ...prevPools,
          [randomToken.id]: {
            ...currentPool,
            solReserve: newSolReserve,
            tokenReserve: newTokenReserve,
          },
        };
      });

      // Update current candle close
      setCandlesticks((prev) => {
        const list = prev[randomToken.id] || [];
        if (list.length === 0) return prev;
        const last = { ...list[list.length - 1] };
        const updatedClose = last.close * (1 + deltaPercent);
        last.close = updatedClose;
        last.high = Math.max(last.high, updatedClose);
        last.low = Math.min(last.low, updatedClose);
        return {
          ...prev,
          [randomToken.id]: [...list.slice(0, -1), last],
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [mode, tokens]);

  // Execute a practice swap (Buy or Sell)
  const executePracticeSwap = (quote: SwapQuote): { success: boolean; error?: string } => {
    const pool = pools[activeToken.id];
    if (!pool) return { success: false, error: 'Liquidity pool not found' };

    if (!quote.isLiquiditySufficient) {
      return { success: false, error: quote.errorMessage || 'Insufficient pool liquidity' };
    }

    if (quote.type === 'buy') {
      if (practiceSol < quote.inputAmount) {
        return { success: false, error: 'Insufficient virtual SOL balance' };
      }

      // Check slippage: output must be >= minimum received
      if (quote.outputAmount < quote.minimumReceived) {
        return { success: false, error: 'Slippage tolerance exceeded. Transaction reverted.' };
      }

      // 1. Deduct SOL
      const newPracticeSol = practiceSol - quote.inputAmount;
      setPracticeSol(newPracticeSol);
      savePracticeBalance(newPracticeSol, initialPracticeSol);

      // 2. Update AMM Pool
      const updatedPool = executeSwapOnPool(pool, quote);
      const newPools = { ...pools, [activeToken.id]: updatedPool };
      setPools(newPools);
      savePools(newPools);

      // 3. Update Position
      const existingPos = positions.find((p) => p.tokenId === activeToken.id);
      const updatedPos = recordBuyInPosition(
        existingPos,
        {
          id: activeToken.id,
          symbol: activeToken.symbol,
          name: activeToken.name,
          mintAddress: activeToken.mintAddress,
        },
        quote.inputAmount,
        quote.outputAmount
      );

      const otherPositions = positions.filter((p) => p.tokenId !== activeToken.id);
      const newPositions = [...otherPositions, updatedPos];
      setPositions(newPositions);
      savePositions(newPositions);

      // 4. Record Trade
      const newTrade: Trade = {
        id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        mode: 'practice',
        type: 'buy',
        tokenId: activeToken.id,
        tokenSymbol: activeToken.symbol,
        solAmount: quote.inputAmount,
        tokenAmount: quote.outputAmount,
        executionPriceSol: quote.executionPrice,
        feeSol: quote.tradingFeeSol,
        priceImpactPct: quote.priceImpactPct,
        slippageTolerancePct: slippageTolerance,
        timestamp: Date.now(),
        notes: 'Simulated AMM Buy',
      };
      const newTrades = [newTrade, ...trades];
      setTrades(newTrades);
      saveTrades(newTrades);
      void recordTradeToSupabase({
        tokenId: activeToken.id,
        walletAddress: wallet.publicKey?.toBase58(),
        type: newTrade.type,
        solAmount: newTrade.solAmount,
        tokenAmount: newTrade.tokenAmount,
        executionPriceSol: newTrade.executionPriceSol,
        txSignature: newTrade.txSignature,
      });
      void recordMarketSnapshotToSupabase({
        tokenId: activeToken.id,
        priceSol: getSpotPrice(updatedPool.solReserve, updatedPool.tokenReserve),
        volumeSol: newTrade.solAmount,
        liquiditySol: updatedPool.solReserve,
      });

      // 5. Update Candlestick Chart
      const spotPrice = getSpotPrice(updatedPool.solReserve, updatedPool.tokenReserve);
      setCandlesticks((prev) => {
        const list = prev[activeToken.id] || [];
        if (list.length === 0) return prev;
        const last = { ...list[list.length - 1] };
        last.close = spotPrice;
        last.high = Math.max(last.high, spotPrice);
        last.volume += quote.inputAmount;
        return {
          ...prev,
          [activeToken.id]: [...list.slice(0, -1), last],
        };
      });

      // Update Portfolio History Snapshot
      const holdingsValBuy = newPositions.reduce((acc, p) => {
        const pPool = newPools[p.tokenId];
        const s = pPool ? getSpotPrice(pPool.solReserve, pPool.tokenReserve) : p.averageEntryPriceSol;
        return acc + p.tokenAmount * s;
      }, 0);
      const newTotalBuy = newPracticeSol + holdingsValBuy;
      setPortfolioSnapshots((prev) => {
        const snap: PortfolioSnapshot = {
          timestamp: Date.now(),
          portfolioValueSol: parseFloat(newTotalBuy.toFixed(4)),
          availableSol: parseFloat(newPracticeSol.toFixed(4)),
          holdingsValueSol: parseFloat(holdingsValBuy.toFixed(4)),
          totalPnLSol: parseFloat((newTotalBuy - initialPracticeSol).toFixed(4)),
        };
        const updated = [...prev, snap];
        savePortfolioSnapshots(updated);
        return updated;
      });

      return { success: true };
    } else {
      // SELL
      const existingPos = positions.find((p) => p.tokenId === activeToken.id);
      if (!existingPos || existingPos.tokenAmount < quote.inputAmount) {
        return { success: false, error: 'Insufficient token balance to sell' };
      }

      if (quote.outputAmount < quote.minimumReceived) {
        return { success: false, error: 'Slippage tolerance exceeded. Transaction reverted.' };
      }

      // 1. Add SOL proceeds
      const newPracticeSol = practiceSol + quote.outputAmount;
      setPracticeSol(newPracticeSol);
      savePracticeBalance(newPracticeSol, initialPracticeSol);

      // 2. Update AMM Pool
      const updatedPool = executeSwapOnPool(pool, quote);
      const newPools = { ...pools, [activeToken.id]: updatedPool };
      setPools(newPools);
      savePools(newPools);

      // 3. Update Position & Realized P&L
      const sellResult = recordSellInPosition(existingPos, quote.inputAmount, quote.outputAmount);
      const otherPositions = positions.filter((p) => p.tokenId !== activeToken.id);
      const newPositions = [...otherPositions, sellResult.updatedPosition];
      setPositions(newPositions);
      savePositions(newPositions);

      // 4. Record Trade with Realized P&L
      const newTrade: Trade = {
        id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        mode: 'practice',
        type: 'sell',
        tokenId: activeToken.id,
        tokenSymbol: activeToken.symbol,
        solAmount: quote.outputAmount,
        tokenAmount: quote.inputAmount,
        executionPriceSol: quote.executionPrice,
        feeSol: quote.tradingFeeSol,
        priceImpactPct: quote.priceImpactPct,
        slippageTolerancePct: slippageTolerance,
        timestamp: Date.now(),
        realizedPnLSol: sellResult.realizedPnLSol,
        notes: 'Simulated AMM Sell',
      };
      const newTrades = [newTrade, ...trades];
      setTrades(newTrades);
      saveTrades(newTrades);
      void recordTradeToSupabase({
        tokenId: activeToken.id,
        walletAddress: wallet.publicKey?.toBase58(),
        type: newTrade.type,
        solAmount: newTrade.solAmount,
        tokenAmount: newTrade.tokenAmount,
        executionPriceSol: newTrade.executionPriceSol,
        txSignature: newTrade.txSignature,
      });
      void recordMarketSnapshotToSupabase({
        tokenId: activeToken.id,
        priceSol: getSpotPrice(updatedPool.solReserve, updatedPool.tokenReserve),
        volumeSol: newTrade.solAmount,
        liquiditySol: updatedPool.solReserve,
      });

      // 5. Update Candlestick Chart
      const spotPrice = getSpotPrice(updatedPool.solReserve, updatedPool.tokenReserve);
      setCandlesticks((prev) => {
        const list = prev[activeToken.id] || [];
        if (list.length === 0) return prev;
        const last = { ...list[list.length - 1] };
        last.close = spotPrice;
        last.low = Math.min(last.low, spotPrice);
        last.volume += quote.outputAmount;
        return {
          ...prev,
          [activeToken.id]: [...list.slice(0, -1), last],
        };
      });

      // Update Portfolio History Snapshot
      const holdingsValSell = newPositions.reduce((acc, p) => {
        const pPool = newPools[p.tokenId];
        const s = pPool ? getSpotPrice(pPool.solReserve, pPool.tokenReserve) : p.averageEntryPriceSol;
        return acc + p.tokenAmount * s;
      }, 0);
      const newTotalSell = newPracticeSol + holdingsValSell;
      setPortfolioSnapshots((prev) => {
        const snap: PortfolioSnapshot = {
          timestamp: Date.now(),
          portfolioValueSol: parseFloat(newTotalSell.toFixed(4)),
          availableSol: parseFloat(newPracticeSol.toFixed(4)),
          holdingsValueSol: parseFloat(holdingsValSell.toFixed(4)),
          totalPnLSol: parseFloat((newTotalSell - initialPracticeSol).toFixed(4)),
        };
        const updated = [...prev, snap];
        savePortfolioSnapshots(updated);
        return updated;
      });

      return { success: true };
    }
  };

  // Execute a real on-chain swap transaction on Solana Devnet
  const executeDevnetSwap = async (
    quote: SwapQuote
  ): Promise<{ success: boolean; signature?: string; explorerUrl?: string; error?: string }> => {
    if (!connection || !wallet.publicKey || !wallet.sendTransaction) {
      return {
        success: false,
        error: 'Please connect your Solana wallet (e.g. Phantom, Solflare) configured for Devnet.',
      };
    }

    if (quote.type === 'buy') {
      if (devnetSolBalance < quote.inputAmount) {
        return {
          success: false,
          error: `Insufficient Devnet SOL balance. You have ${devnetSolBalance.toFixed(4)} SOL, but need ${quote.inputAmount.toFixed(4)} SOL. Use the Devnet Faucet in the top bar to request test SOL.`,
        };
      }
    } else {
      if (devnetTokenBalance < quote.inputAmount) {
        return {
          success: false,
          error: `Insufficient token balance on Devnet. You have ${devnetTokenBalance} ${activeToken.symbol}.`,
        };
      }
    }

    const solAmt = quote.type === 'buy' ? quote.inputAmount : quote.outputAmount;
    const tokAmt = quote.type === 'buy' ? quote.outputAmount : quote.inputAmount;

    // Execute real on-chain transaction
    const res = await executeDevnetSwapOnChain(
      connection,
      wallet.publicKey,
      wallet.sendTransaction,
      {
        type: quote.type,
        solAmount: solAmt,
        tokenAmount: tokAmt,
        tokenMintAddress: activeToken.mintAddress,
        decimals: activeToken.decimals,
      }
    );

    if (res.success && res.signature) {
      // Record real on-chain transaction in trade history
      const newTrade: Trade = {
        id: 'devnet_' + res.signature.slice(0, 10),
        mode: 'devnet',
        type: quote.type,
        tokenId: activeToken.id,
        tokenSymbol: activeToken.symbol,
        solAmount: solAmt,
        tokenAmount: tokAmt,
        executionPriceSol: quote.executionPrice,
        feeSol: quote.tradingFeeSol,
        priceImpactPct: quote.priceImpactPct,
        slippageTolerancePct: slippageTolerance,
        timestamp: Date.now(),
        txSignature: res.signature,
        notes: `On-chain swap confirmed on Solana Devnet (Slot #${devnetStatus.slot || 'live'})`,
      };
      const updatedTrades = [newTrade, ...trades];
      setTrades(updatedTrades);
      saveTrades(updatedTrades);

      // Instantly trigger live balance sync
      await refreshDevnetData();
    }

    return res;
  };

  // Reset practice account
  const resetPracticeAccount = (newInitialSol: number = INITIAL_PRACTICE_SOL) => {
    resetAllPracticeData();
    const defaultTokens = loadTokens();
    const defaultPools = loadPools(defaultTokens);
    setTokens(defaultTokens);
    setPools(defaultPools);
    setPositions([]);
    setTrades([]);
    setPracticeSol(newInitialSol);
    setInitialPracticeSol(newInitialSol);
    savePracticeBalance(newInitialSol, newInitialSol);
    const freshSnapshots = generateInitialPortfolioSnapshots(newInitialSol);
    setPortfolioSnapshots(freshSnapshots);
    savePortfolioSnapshots(freshSnapshots);
    setActiveToken(defaultTokens[0]);
  };

  // Add custom minted token to playground
  const addCustomToken = (
    token: Token,
    initialSolReserve: number = 20,
    initialTokenReserve: number = 500000
  ) => {
    const updatedTokens = [token, ...tokens];
    setTokens(updatedTokens);
    saveTokens(updatedTokens);

    const x = initialSolReserve;
    const y = initialTokenReserve;
    const newPool: AMMPool = {
      tokenId: token.id,
      solReserve: x,
      tokenReserve: y,
      k: x * y,
      feeBps: 30,
      totalVolumeSol: 0,
      tradesCount: 0,
    };
    const updatedPools = { ...pools, [token.id]: newPool };
    setPools(updatedPools);
    savePools(updatedPools);

    // Generate chart history
    setCandlesticks((prev) => ({
      ...prev,
      [token.id]: generateCandlestickHistory(token.basePriceSol),
    }));

    setActiveToken(token);
  };

  return (
    <TradingContext.Provider
      value={{
        mode,
        setMode,
        tokens,
        activeToken,
        setActiveToken,
        pools,
        positions,
        trades,
        practiceSol,
        initialPracticeSol,
        portfolioSummary,
        portfolioSnapshots,
        dailyPnLEntries,
        slippageTolerance,
        setSlippageTolerance,
        candlesticks,
        devnetSolBalance,
        devnetTokenBalance,
        devnetStatus,
        isDevnetRefreshing,
        refreshDevnetData,
        executePracticeSwap,
        executeDevnetSwap,
        resetPracticeAccount,
        addCustomToken,
        searchQuery,
        setSearchQuery,
        airdropRecords,
        autoAirdropEnabled,
        setAutoAirdropEnabled,
        executeAirdrop,
        isAirdropping,
        totalAirdroppedSol,
        autoAirdropNotice,
        clearAutoAirdropNotice,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
