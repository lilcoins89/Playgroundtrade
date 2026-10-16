import { AMMPool, SwapQuote } from '../types';

/**
 * Constant-product Automated Market Maker (AMM) math: x * y = k
 * x = SOL reserve
 * y = Token reserve
 * k = Invariant product
 */

export const DEFAULT_FEE_BPS = 30; // 0.30% fee

/**
 * Calculates the current instantaneous spot price in SOL per token: x / y
 */
export function getSpotPrice(solReserve: number, tokenReserve: number): number {
  if (tokenReserve <= 0) return 0;
  return solReserve / tokenReserve;
}

/**
 * Quotes a BUY transaction (User pays SOL, receives Tokens)
 * @param pool The AMM pool state
 * @param solIn Amount of SOL the user wants to spend
 * @param slippageTolerancePct User's acceptable slippage (e.g. 1.0 for 1%)
 */
export function calculateBuyQuote(
  pool: AMMPool,
  solIn: number,
  slippageTolerancePct: number = 1.0
): SwapQuote {
  const spotPriceBefore = getSpotPrice(pool.solReserve, pool.tokenReserve);

  if (solIn <= 0) {
    return {
      type: 'buy',
      inputAmount: 0,
      outputAmount: 0,
      spotPriceBefore,
      executionPrice: spotPriceBefore,
      spotPriceAfter: spotPriceBefore,
      priceImpactPct: 0,
      tradingFeeSol: 0,
      minimumReceived: 0,
      newSolReserve: pool.solReserve,
      newTokenReserve: pool.tokenReserve,
      isLiquiditySufficient: true,
    };
  }

  // 1. Calculate fee in SOL
  const feeRate = pool.feeBps / 10000;
  const tradingFeeSol = solIn * feeRate;
  const solInNet = solIn - tradingFeeSol;

  // 2. New SOL reserve after adding net SOL
  const newSolReserve = pool.solReserve + solInNet;

  // 3. New token reserve from invariant k = x * y => y' = k / x'
  const newTokenReserve = pool.k / newSolReserve;

  // 4. Tokens output to user
  const tokenOut = pool.tokenReserve - newTokenReserve;

  // Liquidity safety check: don't allow single swap buying more than 80% of pool reserve
  const isLiquiditySufficient = tokenOut > 0 && tokenOut <= pool.tokenReserve * 0.80;

  if (!isLiquiditySufficient || tokenOut <= 0) {
    return {
      type: 'buy',
      inputAmount: solIn,
      outputAmount: 0,
      spotPriceBefore,
      executionPrice: 0,
      spotPriceAfter: spotPriceBefore,
      priceImpactPct: 100,
      tradingFeeSol,
      minimumReceived: 0,
      newSolReserve: pool.solReserve,
      newTokenReserve: pool.tokenReserve,
      isLiquiditySufficient: false,
      errorMessage: 'Insufficient pool liquidity for order size',
    };
  }

  const executionPrice = solIn / tokenOut;
  const spotPriceAfter = getSpotPrice(newSolReserve, newTokenReserve);
  
  // Price impact based on spot price change
  const priceImpactPct = spotPriceBefore > 0 
    ? Math.max(0, ((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 100)
    : 0;

  // Minimum tokens received factoring in user slippage tolerance
  const minimumReceived = tokenOut * (1 - slippageTolerancePct / 100);

  return {
    type: 'buy',
    inputAmount: solIn,
    outputAmount: tokenOut,
    spotPriceBefore,
    executionPrice,
    spotPriceAfter,
    priceImpactPct,
    tradingFeeSol,
    minimumReceived,
    newSolReserve,
    newTokenReserve,
    isLiquiditySufficient: true,
  };
}

/**
 * Quotes a SELL transaction (User sells Tokens, receives SOL)
 * @param pool The AMM pool state
 * @param tokensIn Amount of tokens the user is selling
 * @param slippageTolerancePct User's acceptable slippage (e.g. 1.0 for 1%)
 */
export function calculateSellQuote(
  pool: AMMPool,
  tokensIn: number,
  slippageTolerancePct: number = 1.0
): SwapQuote {
  const spotPriceBefore = getSpotPrice(pool.solReserve, pool.tokenReserve);

  if (tokensIn <= 0) {
    return {
      type: 'sell',
      inputAmount: 0,
      outputAmount: 0,
      spotPriceBefore,
      executionPrice: spotPriceBefore,
      spotPriceAfter: spotPriceBefore,
      priceImpactPct: 0,
      tradingFeeSol: 0,
      minimumReceived: 0,
      newSolReserve: pool.solReserve,
      newTokenReserve: pool.tokenReserve,
      isLiquiditySufficient: true,
    };
  }

  // 1. New token reserve after user deposits tokens
  const newTokenReserve = pool.tokenReserve + tokensIn;

  // 2. New SOL reserve from invariant k = x * y => x' = k / y'
  const newSolReserveRaw = pool.k / newTokenReserve;

  // 3. Gross SOL out before fee
  const grossSolOut = pool.solReserve - newSolReserveRaw;

  // Liquidity safety check
  const isLiquiditySufficient = grossSolOut > 0 && grossSolOut < pool.solReserve * 0.90;

  if (!isLiquiditySufficient || grossSolOut <= 0) {
    return {
      type: 'sell',
      inputAmount: tokensIn,
      outputAmount: 0,
      spotPriceBefore,
      executionPrice: 0,
      spotPriceAfter: spotPriceBefore,
      priceImpactPct: 100,
      tradingFeeSol: 0,
      minimumReceived: 0,
      newSolReserve: pool.solReserve,
      newTokenReserve: pool.tokenReserve,
      isLiquiditySufficient: false,
      errorMessage: 'Insufficient SOL liquidity in pool for order size',
    };
  }

  // 4. Deduct AMM trading fee
  const feeRate = pool.feeBps / 10000;
  const tradingFeeSol = grossSolOut * feeRate;
  const netSolOut = grossSolOut - tradingFeeSol;

  const executionPrice = netSolOut / tokensIn;
  const finalSolReserve = pool.solReserve - grossSolOut;
  const spotPriceAfter = getSpotPrice(finalSolReserve, newTokenReserve);

  // Price impact
  const priceImpactPct = spotPriceBefore > 0
    ? Math.max(0, ((spotPriceBefore - spotPriceAfter) / spotPriceBefore) * 100)
    : 0;

  const minimumReceived = netSolOut * (1 - slippageTolerancePct / 100);

  return {
    type: 'sell',
    inputAmount: tokensIn,
    outputAmount: netSolOut,
    spotPriceBefore,
    executionPrice,
    spotPriceAfter,
    priceImpactPct,
    tradingFeeSol,
    minimumReceived,
    newSolReserve: finalSolReserve,
    newTokenReserve,
    isLiquiditySufficient: true,
  };
}

/**
 * Applies a swap to the pool state and updates volume/metrics
 */
export function executeSwapOnPool(pool: AMMPool, quote: SwapQuote): AMMPool {
  const volumeSol = quote.type === 'buy' ? quote.inputAmount : quote.outputAmount;

  return {
    ...pool,
    solReserve: quote.newSolReserve,
    tokenReserve: quote.newTokenReserve,
    k: quote.newSolReserve * quote.newTokenReserve,
    totalVolumeSol: pool.totalVolumeSol + volumeSol,
    tradesCount: pool.tradesCount + 1,
  };
}
