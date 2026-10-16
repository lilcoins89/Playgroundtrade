export type AppMode = 'practice' | 'devnet';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  mintAddress: string;
  decimals: number;
  iconUrl?: string;
  color: string;
  description: string;
  isSimulated: boolean;
  basePriceSol: number; // Current spot price in SOL
  priceChange24h: number; // Percentage
  volume24hSol: number;
  marketCapSol: number;
  initialSolReserve: number;
  initialTokenReserve: number;
}

export interface AMMPool {
  tokenId: string;
  solReserve: number; // x
  tokenReserve: number; // y
  k: number; // x * y constant
  feeBps: number; // Basis points (e.g. 30 = 0.3%)
  totalVolumeSol: number;
  tradesCount: number;
}

export interface Position {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  mintAddress: string;
  tokenAmount: number;
  totalCostSol: number; // Total remaining cost basis in SOL
  averageEntryPriceSol: number; // totalCostSol / tokenAmount
  realizedPnLSol: number; // Cumulative realized profit/loss from this token
  lastUpdated: number;
}

export interface Trade {
  id: string;
  mode: AppMode;
  type: 'buy' | 'sell';
  tokenId: string;
  tokenSymbol: string;
  solAmount: number;
  tokenAmount: number;
  executionPriceSol: number; // SOL per token
  feeSol: number;
  priceImpactPct: number;
  slippageTolerancePct: number;
  timestamp: number;
  txSignature?: string;
  realizedPnLSol?: number; // Present on sells
  notes?: string;
}

export interface CandlestickData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwapQuote {
  type: 'buy' | 'sell';
  inputAmount: number;
  outputAmount: number;
  spotPriceBefore: number;
  executionPrice: number;
  spotPriceAfter: number;
  priceImpactPct: number;
  tradingFeeSol: number;
  minimumReceived: number;
  newSolReserve: number;
  newTokenReserve: number;
  isLiquiditySufficient: boolean;
  errorMessage?: string;
}

export interface PortfolioSummary {
  availableSol: number;
  totalHoldingsValueSol: number;
  totalPortfolioValueSol: number;
  totalRealizedPnLSol: number;
  totalUnrealizedPnLSol: number;
  totalReturnPct: number;
  initialVirtualSol: number;
}

export interface PortfolioSnapshot {
  timestamp: number; // Unix timestamp in ms
  portfolioValueSol: number;
  availableSol: number;
  holdingsValueSol: number;
  totalPnLSol: number;
}

export interface DailyPnLEntry {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Oct 10", "Mon"
  timestamp: number;
  realizedPnLSol: number;
  unrealizedPnLSol: number;
  netPnLSol: number;
  portfolioValueSol: number;
  tradesCount: number;
}

export interface TestResult {
  title: string;
  passed: boolean;
  expected: string | number;
  actual: string | number;
  details: string;
}

export interface AirdropRecord {
  id: string;
  walletAddress: string;
  solAmount: number;
  signature?: string;
  timestamp: number;
  type: 'automatic' | 'manual';
  status: 'confirmed' | 'failed';
  error?: string;
}


