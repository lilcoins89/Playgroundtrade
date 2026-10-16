import React from 'react';
import { History, ExternalLink, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { getExplorerUrl, shortenAddress } from '../utils/solana';

export const TradeHistory: React.FC = () => {
  const { trades, mode } = useTrading();

  return (
    <div className="bg-[#111624] border border-[#1d263b] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#1b2336] mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h3 className="font-extrabold text-sm text-white">Trade & Execution History</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {trades.length} {trades.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="py-8 text-center text-slate-500 font-mono text-xs">
          <p>No trade history recorded yet.</p>
          <p className="text-[11px] text-slate-600 mt-1">
            Simulated and Devnet trades will be automatically logged here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-[#1b2336] text-[11px]">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Token</th>
                <th className="pb-2 font-medium">SOL Amount</th>
                <th className="pb-2 font-medium">Token Amount</th>
                <th className="pb-2 font-medium">Price (SOL)</th>
                <th className="pb-2 font-medium">Realized P&L</th>
                <th className="pb-2 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171f30]">
              {trades.map((trade) => {
                const isBuy = trade.type === 'buy';
                const dateStr = new Date(trade.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={trade.id} className="hover:bg-[#141b2a]/60 transition-colors">
                    <td className="py-2.5 text-slate-400 text-[11px]">{dateStr}</td>

                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isBuy
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {trade.type}
                      </span>
                    </td>

                    <td className="py-2.5 font-bold text-white">{trade.tokenSymbol}</td>

                    <td className="py-2.5 text-slate-200">
                      {trade.solAmount.toFixed(4)} SOL
                    </td>

                    <td className="py-2.5 text-slate-300">
                      {trade.tokenAmount > 1000
                        ? trade.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : trade.tokenAmount.toFixed(4)}
                    </td>

                    <td className="py-2.5 text-slate-400">
                      {trade.executionPriceSol < 0.0001
                        ? trade.executionPriceSol.toFixed(7)
                        : trade.executionPriceSol.toFixed(5)}
                    </td>

                    <td className="py-2.5">
                      {trade.realizedPnLSol !== undefined ? (
                        <span
                          className={`font-semibold ${
                            trade.realizedPnLSol >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {trade.realizedPnLSol >= 0 ? '+' : ''}
                          {trade.realizedPnLSol.toFixed(4)} SOL
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 text-right">
                      {trade.txSignature ? (
                        <a
                          href={getExplorerUrl(trade.txSignature, 'tx')}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#14F195] hover:underline text-[11px]"
                        >
                          <span>{shortenAddress(trade.txSignature, 4)}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-amber-400/80 text-[10px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Simulated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
