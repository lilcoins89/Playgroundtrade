import { Position, Trade, PortfolioSummary } from '../types';

/**
 * P&L Calculation Module using Weighted-Average Cost Basis
 *
 * 1. Multiple Purchases:
 *    When buying delta_T tokens for delta_C SOL:
 *    new_total_tokens = old_total_tokens + delta_T
 *    new_cost_basis = old_cost_basis + delta_C
 *    avg_entry_price = new_cost_basis / new_total_tokens
 *
 * 2. Partial / Full Sells:
 *    When selling sold_T tokens receiving sold_SOL net:
 *    cost_of_sold_portion = sold_T * avg_entry_price
 *    realized_pnl_for_trade = sold_SOL - cost_of_sold_portion
 *    remaining_tokens = old_total_tokens - sold_T
 *    remaining_cost_basis = remaining_tokens * avg_entry_price
 *    (avg_entry_price remains unchanged after a sell)
 *
 * 3. Unrealized P&L:
 *    current_value = remaining_tokens * current_spot_price
 *    unrealized_pnl = current_value - remaining_cost_basis
 */

/**
 * Updates or creates a position after a BUY trade
 */
export function recordBuyInPosition(
  existingPosition: Position | undefined,
  tokenInfo: { id: string; symbol: string; name: string; mintAddress: string },
  solSpent: number,
  tokensReceived: number
): Position {
  if (tokensReceived <= 0) {
    if (existingPosition) return existingPosition;
    return {
      tokenId: tokenInfo.id,
      tokenSymbol: tokenInfo.symbol,
      tokenName: tokenInfo.name,
      mintAddress: tokenInfo.mintAddress,
      tokenAmount: 0,
      totalCostSol: 0,
      averageEntryPriceSol: 0,
      realizedPnLSol: 0,
      lastUpdated: Date.now(),
    };
  }

  const prevAmount = existingPosition?.tokenAmount || 0;
  const prevCost = existingPosition?.totalCostSol || 0;
  const prevRealized = existingPosition?.realizedPnLSol || 0;

  const newAmount = prevAmount + tokensReceived;
  const newCost = prevCost + solSpent;
  const newAvgPrice = newAmount > 0 ? newCost / newAmount : 0;

  return {
    tokenId: tokenInfo.id,
    tokenSymbol: tokenInfo.symbol,
    tokenName: tokenInfo.name,
    mintAddress: tokenInfo.mintAddress,
    tokenAmount: newAmount,
    totalCostSol: newCost,
    averageEntryPriceSol: newAvgPrice,
    realizedPnLSol: prevRealized,
    lastUpdated: Date.now(),
  };
}

export interface SellResult {
  updatedPosition: Position;
  realizedPnLSol: number;
  costOfSoldTokensSol: number;
}

/**
 * Updates a position after a SELL trade and computes realized P&L
 */
export function recordSellInPosition(
  existingPosition: Position | undefined,
  tokensSold: number,
  netSolReceived: number
): SellResult {
  if (!existingPosition || existingPosition.tokenAmount <= 0) {
    return {
      updatedPosition: existingPosition || {
        tokenId: '',
        tokenSymbol: '',
        tokenName: '',
        mintAddress: '',
        tokenAmount: 0,
        totalCostSol: 0,
        averageEntryPriceSol: 0,
        realizedPnLSol: 0,
        lastUpdated: Date.now(),
      },
      realizedPnLSol: 0,
      costOfSoldTokensSol: 0,
    };
  }

  const safeTokensSold = Math.min(tokensSold, existingPosition.tokenAmount);
  const costOfSoldTokensSol = safeTokensSold * existingPosition.averageEntryPriceSol;
  const realizedPnLSol = netSolReceived - costOfSoldTokensSol;

  const remainingTokens = Math.max(0, existingPosition.tokenAmount - safeTokensSold);
  
  // If zero tokens remain, cost basis is zero
  const remainingCostSol = remainingTokens > 0 
    ? remainingTokens * existingPosition.averageEntryPriceSol 
    : 0;
    
  const updatedAvgPrice = remainingTokens > 0 
    ? existingPosition.averageEntryPriceSol 
    : 0;

  const updatedPosition: Position = {
    ...existingPosition,
    tokenAmount: remainingTokens,
    totalCostSol: remainingCostSol,
    averageEntryPriceSol: updatedAvgPrice,
    realizedPnLSol: existingPosition.realizedPnLSol + realizedPnLSol,
    lastUpdated: Date.now(),
  };

  return {
    updatedPosition,
    realizedPnLSol,
    costOfSoldTokensSol,
  };
}

/**
 * Calculates current unrealized P&L for a position at spot price
 */
export function calculateUnrealizedPnL(position: Position, currentSpotPriceSol: number): {
  currentValueSol: number;
  unrealizedPnLSol: number;
  unrealizedPnLPct: number;
} {
  if (position.tokenAmount <= 0 || position.totalCostSol <= 0) {
    return { currentValueSol: 0, unrealizedPnLSol: 0, unrealizedPnLPct: 0 };
  }

  const currentValueSol = position.tokenAmount * currentSpotPriceSol;
  const unrealizedPnLSol = currentValueSol - position.totalCostSol;
  const unrealizedPnLPct = position.totalCostSol > 0 
    ? (unrealizedPnLSol / position.totalCostSol) * 100 
    : 0;

  return {
    currentValueSol,
    unrealizedPnLSol,
    unrealizedPnLPct,
  };
}

/**
 * Aggregates overall portfolio summary across all positions and SOL balance
 */
export function calculatePortfolioSummary(
  availableSol: number,
  initialVirtualSol: number,
  positions: Position[],
  tokenPricesMap: Record<string, number>
): PortfolioSummary {
  let totalHoldingsValueSol = 0;
  let totalRealizedPnLSol = 0;
  let totalUnrealizedPnLSol = 0;

  for (const pos of positions) {
    totalRealizedPnLSol += pos.realizedPnLSol;
    if (pos.tokenAmount > 0) {
      const currentPrice = tokenPricesMap[pos.tokenId] || pos.averageEntryPriceSol;
      const { currentValueSol, unrealizedPnLSol } = calculateUnrealizedPnL(pos, currentPrice);
      totalHoldingsValueSol += currentValueSol;
      totalUnrealizedPnLSol += unrealizedPnLSol;
    }
  }

  const totalPortfolioValueSol = availableSol + totalHoldingsValueSol;
  
  // Total Return % = (Portfolio Value - Initial Balance) / Initial Balance * 100
  const totalReturnPct = initialVirtualSol > 0
    ? ((totalPortfolioValueSol - initialVirtualSol) / initialVirtualSol) * 100
    : 0;

  return {
    availableSol,
    totalHoldingsValueSol,
    totalPortfolioValueSol,
    totalRealizedPnLSol,
    totalUnrealizedPnLSol,
    totalReturnPct,
    initialVirtualSol,
  };
}
