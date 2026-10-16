import { TestResult, AMMPool } from '../types';
import { calculateBuyQuote, calculateSellQuote, getSpotPrice } from './amm';
import {
  recordBuyInPosition,
  recordSellInPosition,
  calculateUnrealizedPnL,
  calculatePortfolioSummary,
} from './pnl';

/**
 * Executes a comprehensive automated test suite verifying:
 * 1. AMM constant product invariant (x * y = k)
 * 2. Trading fees deduction
 * 3. Slippage protection and price impact calculation
 * 4. Weighted-average cost basis on multiple buys
 * 5. Partial sells with realized P&L calculation
 * 6. Cost basis persistence after partial sell
 * 7. Unrealized P&L calculation
 * 8. Zero balance handling
 */
export function runTradingMathTests(): TestResult[] {
  const results: TestResult[] = [];

  // TEST 1: AMM Buy Quote & Reserve Math
  try {
    const pool: AMMPool = {
      tokenId: 'test-token',
      solReserve: 100, // 100 SOL
      tokenReserve: 1000000, // 1,000,000 TOKENS
      k: 100 * 1000000, // 100,000,000
      feeBps: 30, // 0.3%
      totalVolumeSol: 0,
      tradesCount: 0,
    };

    const solIn = 1.0; // Spend 1 SOL
    const quote = calculateBuyQuote(pool, solIn, 1.0);

    // Fee should be 1.0 * 0.003 = 0.003 SOL
    // Net SOL in = 0.997 SOL
    // New SOL reserve = 100.997
    // New token reserve = 100,000,000 / 100.997 = 990,128.41965...
    // Tokens received = 1,000,000 - 990,128.41965 = 9,871.5803...
    const feeMatch = Math.abs(quote.tradingFeeSol - 0.003) < 0.00001;
    const tokensMatch = Math.abs(quote.outputAmount - 9871.58) < 1.0;
    const invariantMaintained = Math.abs(quote.newSolReserve * quote.newTokenReserve - pool.k) < 1.0;

    results.push({
      title: 'AMM Buy Quote & Fee Deduction (x * y = k)',
      passed: feeMatch && tokensMatch && invariantMaintained,
      expected: 'Output ~9871.58 tokens, Fee 0.003 SOL, k conserved',
      actual: `Output: ${quote.outputAmount.toFixed(2)} tokens, Fee: ${quote.tradingFeeSol.toFixed(4)} SOL`,
      details: 'Net SOL enters reserve, token reserve drops to maintain constant product invariant.',
    });
  } catch (err: any) {
    results.push({
      title: 'AMM Buy Quote',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown during calculation',
    });
  }

  // TEST 2: AMM Sell Quote & Fee Deduction
  try {
    const pool: AMMPool = {
      tokenId: 'test-token',
      solReserve: 100,
      tokenReserve: 1000000,
      k: 100000000,
      feeBps: 30, // 0.3%
      totalVolumeSol: 0,
      tradesCount: 0,
    };

    const tokensIn = 10000;
    const quote = calculateSellQuote(pool, tokensIn, 1.0);

    // New token reserve = 1,010,000
    // New SOL reserve = 100,000,000 / 1,010,000 = 99.0099... SOL
    // Gross SOL out = 100 - 99.0099 = 0.990099 SOL
    // Fee = 0.990099 * 0.003 = 0.00297 SOL
    // Net SOL out = 0.990099 - 0.00297 = 0.987129 SOL
    const grossSolOut = 100 - (100000000 / 1010000);
    const expectedNet = grossSolOut * (1 - 0.003);
    const passed = Math.abs(quote.outputAmount - expectedNet) < 0.0001;

    results.push({
      title: 'AMM Sell Quote & SOL Output',
      passed,
      expected: `Net SOL: ${expectedNet.toFixed(5)} SOL`,
      actual: `Net SOL: ${quote.outputAmount.toFixed(5)} SOL (Fee: ${quote.tradingFeeSol.toFixed(5)} SOL)`,
      details: 'Selling tokens increases token reserve and returns SOL minus AMM protocol fee.',
    });
  } catch (err: any) {
    results.push({
      title: 'AMM Sell Quote',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown',
    });
  }

  // TEST 3: Weighted-Average Cost Basis on Multiple Buys
  try {
    const token = {
      id: 'pepe',
      symbol: 'PEPE',
      name: 'Pepe Dev',
      mintAddress: 'DevnetPepeMint1111111111111111111111111111111',
    };

    // Buy 1: 1,000 tokens for 1.0 SOL (avg price = 0.001 SOL/token)
    let pos = recordBuyInPosition(undefined, token, 1.0, 1000);
    const pass1 = pos.tokenAmount === 1000 && pos.totalCostSol === 1.0 && pos.averageEntryPriceSol === 0.001;

    // Buy 2: 1,000 tokens for 2.0 SOL (avg price should now be (1 + 2) / 2000 = 0.0015 SOL/token)
    pos = recordBuyInPosition(pos, token, 2.0, 1000);
    const pass2 = pos.tokenAmount === 2000 && pos.totalCostSol === 3.0 && Math.abs(pos.averageEntryPriceSol - 0.0015) < 0.000001;

    results.push({
      title: 'Weighted-Average Cost Basis (Multiple Purchases)',
      passed: pass1 && pass2,
      expected: '2000 tokens, 3.0 SOL cost, avg entry 0.0015 SOL/token',
      actual: `${pos.tokenAmount} tokens, ${pos.totalCostSol.toFixed(2)} SOL cost, avg entry ${pos.averageEntryPriceSol.toFixed(4)} SOL/token`,
      details: 'Accumulates total cost basis and adjusts weighted-average entry price per token.',
    });
  } catch (err: any) {
    results.push({
      title: 'Weighted-Average Cost Basis',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown',
    });
  }

  // TEST 4: Partial Sells & Realized P&L
  try {
    const token = {
      id: 'pepe',
      symbol: 'PEPE',
      name: 'Pepe Dev',
      mintAddress: 'DevnetPepeMint1111111111111111111111111111111',
    };

    // Position: 2000 tokens with cost basis 3.0 SOL (avg price 0.0015 SOL/token)
    let pos = recordBuyInPosition(undefined, token, 3.0, 2000);

    // Partial Sell: Sell 500 tokens for 1.5 SOL net (price was 0.003 SOL/token)
    // Cost of sold 500 tokens = 500 * 0.0015 = 0.75 SOL
    // Realized P&L = 1.5 SOL - 0.75 SOL = +0.75 SOL profit!
    // Remaining tokens = 1500 tokens
    // Remaining cost basis = 1500 * 0.0015 = 2.25 SOL
    // Average entry price remains 0.0015 SOL/token!
    const sellRes = recordSellInPosition(pos, 500, 1.5);
    pos = sellRes.updatedPosition;

    const pnlMatch = Math.abs(sellRes.realizedPnLSol - 0.75) < 0.00001;
    const remainingTokensMatch = pos.tokenAmount === 1500;
    const remainingCostMatch = Math.abs(pos.totalCostSol - 2.25) < 0.00001;
    const avgPricePreserved = Math.abs(pos.averageEntryPriceSol - 0.0015) < 0.00001;

    results.push({
      title: 'Partial Sell & Realized P&L Math',
      passed: pnlMatch && remainingTokensMatch && remainingCostMatch && avgPricePreserved,
      expected: 'Realized P&L: +0.75 SOL, Remaining Cost: 2.25 SOL, Avg Price: 0.0015 SOL',
      actual: `Realized P&L: +${sellRes.realizedPnLSol.toFixed(4)} SOL, Remaining Cost: ${pos.totalCostSol.toFixed(2)} SOL, Avg Price: ${pos.averageEntryPriceSol.toFixed(4)} SOL`,
      details: 'Deducts proportional cost basis on partial sell while keeping unit entry price steady.',
    });
  } catch (err: any) {
    results.push({
      title: 'Partial Sell & Realized P&L',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown',
    });
  }

  // TEST 5: Unrealized P&L and Full Exit
  try {
    const token = {
      id: 'wif',
      symbol: 'WIF',
      name: 'Dog Wif Sim',
      mintAddress: 'DevnetWifMint2222222222222222222222222222222',
    };

    // Position: 1000 tokens for 1.0 SOL (avg price = 0.001)
    let pos = recordBuyInPosition(undefined, token, 1.0, 1000);

    // Current spot price = 0.0018 SOL
    // Current value = 1000 * 0.0018 = 1.80 SOL
    // Unrealized P&L = 1.80 - 1.00 = +0.80 SOL (+80%)
    const unPnl = calculateUnrealizedPnL(pos, 0.0018);
    const unPnlPassed = Math.abs(unPnl.unrealizedPnLSol - 0.8) < 0.0001 && Math.abs(unPnl.unrealizedPnLPct - 80) < 0.01;

    // Now sell ALL 1000 tokens for 1.8 SOL
    const fullSell = recordSellInPosition(pos, 1000, 1.8);
    const fullExitPassed = fullSell.updatedPosition.tokenAmount === 0 &&
      fullSell.updatedPosition.totalCostSol === 0 &&
      Math.abs(fullSell.realizedPnLSol - 0.8) < 0.0001;

    results.push({
      title: 'Unrealized P&L & Complete Position Exit',
      passed: unPnlPassed && fullExitPassed,
      expected: 'Unrealized +0.80 SOL (+80%), Full sell leaves 0 tokens & 0 cost basis',
      actual: `Unrealized: +${unPnl.unrealizedPnLSol.toFixed(2)} SOL (+${unPnl.unrealizedPnLPct.toFixed(1)}%), Post-Exit Tokens: ${fullSell.updatedPosition.tokenAmount}`,
      details: 'Clean zeroing of cost basis when position is liquidated, transferring gain to realized P&L.',
    });
  } catch (err: any) {
    results.push({
      title: 'Unrealized P&L & Full Exit',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown',
    });
  }

  // TEST 6: Slippage Protection & Boundary Checking
  try {
    const pool: AMMPool = {
      tokenId: 'test-token',
      solReserve: 10, // Small pool with 10 SOL
      tokenReserve: 1000,
      k: 10000,
      feeBps: 30,
      totalVolumeSol: 0,
      tradesCount: 0,
    };

    // Attempting to buy with 50 SOL against a 10 SOL pool (would drain > 80% of pool)
    const quoteLarge = calculateBuyQuote(pool, 50, 1.0);
    const rejectedLarge = !quoteLarge.isLiquiditySufficient || quoteLarge.outputAmount === 0;

    // Normal trade with 1% slippage check
    const quoteNormal = calculateBuyQuote(pool, 0.1, 1.0);
    const slippageMatches = quoteNormal.minimumReceived < quoteNormal.outputAmount &&
      Math.abs(quoteNormal.minimumReceived - quoteNormal.outputAmount * 0.99) < 0.001;

    results.push({
      title: 'Slippage Protection & Liquidity Boundary Check',
      passed: rejectedLarge && slippageMatches,
      expected: 'Large trade flagged insufficient liquidity, normal trade calculates minReceived (-1%)',
      actual: `Large order rejected: ${rejectedLarge}, Normal Min Output: ${quoteNormal.minimumReceived.toFixed(2)} / ${quoteNormal.outputAmount.toFixed(2)}`,
      details: 'Ensures pools cannot be drained beyond safety bounds and enforces user slippage tolerance.',
    });
  } catch (err: any) {
    results.push({
      title: 'Slippage Protection',
      passed: false,
      expected: 'Successful calculation',
      actual: err.message,
      details: 'Exception thrown',
    });
  }

  return results;
}
