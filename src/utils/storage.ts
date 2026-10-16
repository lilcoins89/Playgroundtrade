import {
  Token,
  AMMPool,
  Position,
  Trade,
  CandlestickData,
  PortfolioSnapshot,
  DailyPnLEntry,
  AirdropRecord,
} from '../types';

export const INITIAL_PRACTICE_SOL = 10.0;

export const INITIAL_TOKENS: Token[] = [
  {
    id: 'bonkdev',
    name: 'Bonk Devnet',
    symbol: 'BONKDEV',
    mintAddress: 'A2S5h1g8AtDXwvsuBYt9dc2thNpoSdJiURK3YAggRHkQ',
    decimals: 6,
    color: '#f59e0b',
    description: 'The viral Solana devnet dog token for meme enthusiasts.',
    isSimulated: true,
    basePriceSol: 0.000025, // 25 microSOL
    priceChange24h: 18.4,
    volume24hSol: 420.5,
    marketCapSol: 2500,
    initialSolReserve: 50,
    initialTokenReserve: 2000000,
  },
  {
    id: 'wifsim',
    name: 'Dog Wif Sim',
    symbol: 'WIFSIM',
    mintAddress: 'DP7T4WrnRe5BybdqJRdyu3S9Wd6zsmKdVPErPKoGsr5S',
    decimals: 6,
    color: '#ec4899',
    description: 'The simulated hat stays on. High beta meme coin testing grounds.',
    isSimulated: true,
    basePriceSol: 0.00015,
    priceChange24h: -6.2,
    volume24hSol: 680.1,
    marketCapSol: 4500,
    initialSolReserve: 100,
    initialTokenReserve: 666666,
  },
  {
    id: 'pepedev',
    name: 'Pepe Devnet Frog',
    symbol: 'PEPEDEV',
    mintAddress: 'GXy3TtyX7sRS2kyBftQEcqPoC6g7VyWUooxvY6fq51gj',
    decimals: 6,
    color: '#10b981',
    description: 'The ancient frog meme ported to Solana Devnet AMM pools.',
    isSimulated: true,
    basePriceSol: 0.00008,
    priceChange24h: 34.8,
    volume24hSol: 920.8,
    marketCapSol: 3200,
    initialSolReserve: 80,
    initialTokenReserve: 1000000,
  },
  {
    id: 'popcat99',
    name: 'Popcat Dev',
    symbol: 'POPCAT99',
    mintAddress: 'DdtvpQuNhRBdn18Dkbo1yczWTHqxrgAUait8a5CtzKpy',
    decimals: 6,
    color: '#3b82f6',
    description: 'Pop, pop, pop! Simulated liquidity curve inspired by the feline meme.',
    isSimulated: true,
    basePriceSol: 0.00032,
    priceChange24h: 8.9,
    volume24hSol: 512.4,
    marketCapSol: 6400,
    initialSolReserve: 120,
    initialTokenReserve: 375000,
  },
  {
    id: 'solcat',
    name: 'Solana Speed Cat',
    symbol: 'SOLCAT',
    mintAddress: 'B3NcR1ii4xkdPHmKcYsC6XxTDQfHCChTwkPBHCBdgxMT',
    decimals: 6,
    color: '#8b5cf6',
    description: 'Superfast transaction testing mascot with lightning purrs.',
    isSimulated: true,
    basePriceSol: 0.000045,
    priceChange24h: -12.5,
    volume24hSol: 310.0,
    marketCapSol: 1800,
    initialSolReserve: 45,
    initialTokenReserve: 1000000,
  },
];

export function initializePools(tokens: Token[]): Record<string, AMMPool> {
  const pools: Record<string, AMMPool> = {};
  for (const token of tokens) {
    const x = token.initialSolReserve;
    const y = token.initialTokenReserve;
    pools[token.id] = {
      tokenId: token.id,
      solReserve: x,
      tokenReserve: y,
      k: x * y,
      feeBps: 30, // 0.30%
      totalVolumeSol: token.volume24hSol,
      tradesCount: Math.floor(token.volume24hSol * 4),
    };
  }
  return pools;
}

// Generate seeded historical candlesticks for a token
export function generateCandlestickHistory(basePrice: number, points = 40): CandlestickData[] {
  const candles: CandlestickData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 300; // 5-minute candles
  let currentPrice = basePrice * 0.85;

  for (let i = points; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const deltaPct = (Math.random() - 0.48) * 0.06; // Slight upward bias
    const open = currentPrice;
    const close = Math.max(0.000001, open * (1 + deltaPct));
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.random() * 8 + 1; // SOL volume

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });
    currentPrice = close;
  }

  return candles;
}

// LocalStorage Keys
const KEYS = {
  PRACTICE_SOL: 'sol_meme_practice_sol_balance',
  INITIAL_SOL: 'sol_meme_initial_sol_target',
  TOKENS: 'sol_meme_tokens_list',
  POOLS: 'sol_meme_amm_pools',
  POSITIONS: 'sol_meme_practice_positions',
  TRADES: 'sol_meme_trade_history',
  SLIPPAGE: 'sol_meme_slippage_pref',
  PORTFOLIO_SNAPSHOTS: 'sol_meme_portfolio_snapshots',
  AIRDROP_RECORDS: 'sol_meme_airdrop_records',
  AUTO_AIRDROP_ENABLED: 'sol_meme_auto_airdrop_enabled',
};

export function loadPracticeBalance(): { current: number; initial: number } {
  try {
    const saved = localStorage.getItem(KEYS.PRACTICE_SOL);
    const initialSaved = localStorage.getItem(KEYS.INITIAL_SOL);
    return {
      current: saved ? parseFloat(saved) : INITIAL_PRACTICE_SOL,
      initial: initialSaved ? parseFloat(initialSaved) : INITIAL_PRACTICE_SOL,
    };
  } catch {
    return { current: INITIAL_PRACTICE_SOL, initial: INITIAL_PRACTICE_SOL };
  }
}

export function savePracticeBalance(current: number, initial?: number): void {
  try {
    localStorage.setItem(KEYS.PRACTICE_SOL, current.toString());
    if (initial !== undefined) {
      localStorage.setItem(KEYS.INITIAL_SOL, initial.toString());
    }
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function loadTokens(): Token[] {
  try {
    const saved = localStorage.getItem(KEYS.TOKENS);
    if (!saved) return INITIAL_TOKENS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TOKENS;
  } catch {
    return INITIAL_TOKENS;
  }
}

export function saveTokens(tokens: Token[]): void {
  try {
    localStorage.setItem(KEYS.TOKENS, JSON.stringify(tokens));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function loadPools(tokens: Token[]): Record<string, AMMPool> {
  try {
    const saved = localStorage.getItem(KEYS.POOLS);
    if (!saved) return initializePools(tokens);
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : initializePools(tokens);
  } catch {
    return initializePools(tokens);
  }
}

export function savePools(pools: Record<string, AMMPool>): void {
  try {
    localStorage.setItem(KEYS.POOLS, JSON.stringify(pools));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function loadPositions(): Position[] {
  try {
    const saved = localStorage.getItem(KEYS.POSITIONS);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]): void {
  try {
    localStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function loadTrades(): Trade[] {
  try {
    const saved = localStorage.getItem(KEYS.TRADES);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]): void {
  try {
    localStorage.setItem(KEYS.TRADES, JSON.stringify(trades));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function generateInitialPortfolioSnapshots(initialSol: number = INITIAL_PRACTICE_SOL): PortfolioSnapshot[] {
  const snapshots: PortfolioSnapshot[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = 14;

  // Realistic seeded seed-drift
  let currentVal = initialSol * 0.94; // slight dip 14 days ago
  const drifts = [-0.15, 0.35, 0.2, -0.4, 0.65, -0.1, 0.45, 0.8, -0.3, 0.5, 0.3, -0.2, 0.4, 0.25];

  for (let i = days; i >= 1; i--) {
    const timestamp = now - i * dayMs;
    const driftIndex = (days - i) % drifts.length;
    currentVal = Math.max(initialSol * 0.5, currentVal + drifts[driftIndex]);
    const holdingsPortion = currentVal * 0.35;
    const solPortion = currentVal - holdingsPortion;

    snapshots.push({
      timestamp,
      portfolioValueSol: parseFloat(currentVal.toFixed(4)),
      availableSol: parseFloat(solPortion.toFixed(4)),
      holdingsValueSol: parseFloat(holdingsPortion.toFixed(4)),
      totalPnLSol: parseFloat((currentVal - initialSol).toFixed(4)),
    });
  }

  // Final current snapshot
  snapshots.push({
    timestamp: now,
    portfolioValueSol: initialSol,
    availableSol: initialSol,
    holdingsValueSol: 0,
    totalPnLSol: 0,
  });

  return snapshots;
}

export function loadPortfolioSnapshots(initialSol: number = INITIAL_PRACTICE_SOL): PortfolioSnapshot[] {
  try {
    const saved = localStorage.getItem(KEYS.PORTFOLIO_SNAPSHOTS);
    if (!saved) {
      const seeded = generateInitialPortfolioSnapshots(initialSol);
      savePortfolioSnapshots(seeded);
      return seeded;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const seeded = generateInitialPortfolioSnapshots(initialSol);
    savePortfolioSnapshots(seeded);
    return seeded;
  } catch {
    return generateInitialPortfolioSnapshots(initialSol);
  }
}

export function savePortfolioSnapshots(snapshots: PortfolioSnapshot[]): void {
  try {
    // Keep max 200 points to preserve localStorage capacity
    const pruned = snapshots.slice(-200);
    localStorage.setItem(KEYS.PORTFOLIO_SNAPSHOTS, JSON.stringify(pruned));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

export function calculateDailyPnLEntries(
  snapshots: PortfolioSnapshot[],
  trades: Trade[]
): DailyPnLEntry[] {
  if (snapshots.length === 0) return [];

  // Group snapshots by YYYY-MM-DD
  const dayGroups: Record<string, { snapshots: PortfolioSnapshot[]; trades: Trade[] }> = {};

  for (const s of snapshots) {
    const d = new Date(s.timestamp);
    const dateKey = d.toISOString().split('T')[0];
    if (!dayGroups[dateKey]) {
      dayGroups[dateKey] = { snapshots: [], trades: [] };
    }
    dayGroups[dateKey].snapshots.push(s);
  }

  for (const t of trades) {
    const d = new Date(t.timestamp);
    const dateKey = d.toISOString().split('T')[0];
    if (!dayGroups[dateKey]) {
      dayGroups[dateKey] = { snapshots: [], trades: [] };
    }
    dayGroups[dateKey].trades.push(t);
  }

  const sortedDates = Object.keys(dayGroups).sort();
  const dailyEntries: DailyPnLEntry[] = [];

  let previousDayClose = snapshots[0]?.portfolioValueSol || 10;

  for (const dateKey of sortedDates) {
    const group = dayGroups[dateKey];
    const daySnaps = group.snapshots;
    const dayTrades = group.trades;

    const lastSnap = daySnaps.length > 0 ? daySnaps[daySnaps.length - 1] : null;
    const currentClose = lastSnap ? lastSnap.portfolioValueSol : previousDayClose;

    // Realized P&L from trades on this day
    const realizedPnL = dayTrades.reduce((acc, t) => acc + (t.realizedPnLSol || 0), 0);

    // Net P&L for the day = Day Close - Previous Day Close
    const netPnL = currentClose - previousDayClose;
    const unrealizedPnL = netPnL - realizedPnL;

    const dateObj = new Date(dateKey + 'T12:00:00Z');
    const dayLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    dailyEntries.push({
      date: dateKey,
      dayLabel,
      timestamp: dateObj.getTime(),
      realizedPnLSol: parseFloat(realizedPnL.toFixed(4)),
      unrealizedPnLSol: parseFloat(unrealizedPnL.toFixed(4)),
      netPnLSol: parseFloat(netPnL.toFixed(4)),
      portfolioValueSol: parseFloat(currentClose.toFixed(4)),
      tradesCount: dayTrades.length,
    });

    previousDayClose = currentClose;
  }

  return dailyEntries;
}

export function resetAllPracticeData(): void {
  try {
    localStorage.removeItem(KEYS.PRACTICE_SOL);
    localStorage.removeItem(KEYS.INITIAL_SOL);
    localStorage.removeItem(KEYS.TOKENS);
    localStorage.removeItem(KEYS.POOLS);
    localStorage.removeItem(KEYS.POSITIONS);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.PORTFOLIO_SNAPSHOTS);
  } catch (err) {
    console.error('Reset error:', err);
  }
}

export function loadAirdropRecords(walletAddress?: string): AirdropRecord[] {
  try {
    const saved = localStorage.getItem(KEYS.AIRDROP_RECORDS);
    if (!saved) return [];
    const parsed: AirdropRecord[] = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    if (walletAddress) {
      return parsed.filter((r) => r.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveAirdropRecord(record: AirdropRecord): void {
  try {
    const existing = loadAirdropRecords();
    const updated = [record, ...existing.filter((r) => r.id !== record.id)].slice(0, 100);
    localStorage.setItem(KEYS.AIRDROP_RECORDS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save airdrop record:', err);
  }
}

export function loadAutoAirdropEnabled(): boolean {
  try {
    const saved = localStorage.getItem(KEYS.AUTO_AIRDROP_ENABLED);
    return saved === null ? true : saved === 'true'; // Default enabled
  } catch {
    return true;
  }
}

export function saveAutoAirdropEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEYS.AUTO_AIRDROP_ENABLED, enabled.toString());
  } catch (err) {
    console.error('Failed to save auto airdrop preference:', err);
  }
}


