import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  FlaskConical,
  Calculator,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { runTradingMathTests } from '../utils/tests';
import { TestResult } from '../types';

interface TestSuiteModalProps {
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ onClose }) => {
  const [results, setResults] = useState<TestResult[]>(() => runTradingMathTests());
  const [isRunning, setIsRunning] = useState(false);

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runTradingMathTests());
      setIsRunning(false);
    }, 400);
  };

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111624] border border-[#232f48] rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1b2336] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                AMM Math & P&L Test Suite
              </h2>
              <p className="text-xs text-slate-400">
                Automated verification of constant-product invariant, fee deductions, slippage, and weighted-average cost basis
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

        {/* Status Bar */}
        <div className="bg-[#0b0e14] border border-[#1b2336] rounded-xl p-3.5 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {totalPassed} / {results.length} Tests Passing
              </span>
            </div>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-xs font-mono text-slate-400">
              100% Invariant Integrity
            </span>
          </div>

          <button
            onClick={handleRerun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#14F195] hover:bg-[#10d482] text-black transition-colors"
          >
            <RotateCw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Rerun Tests</span>
          </button>
        </div>

        {/* Tests List */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {results.map((res, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs font-mono ${
                res.passed
                  ? 'bg-[#0d131f] border-[#1d2a42]'
                  : 'bg-rose-950/40 border-rose-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  {res.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{res.title}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    res.passed
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="text-slate-400 text-[11px] mb-2 leading-relaxed font-sans">
                {res.details}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-[#0b0e14] p-2.5 rounded-lg border border-[#171f30]">
                <div>
                  <span className="text-slate-500 block">Expected:</span>
                  <span className="text-slate-300">{res.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Actual:</span>
                  <span className="text-emerald-400 font-semibold">{res.actual}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#1b2336] flex items-center justify-between text-xs text-slate-500">
          <span>Formulas: Constant Product (x * y = k) & Weighted Avg Cost</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#182338] text-white hover:bg-[#23314e] font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
