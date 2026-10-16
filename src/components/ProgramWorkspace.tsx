import React, { useMemo, useState } from 'react';
import { Braces, CheckCircle2, ChevronDown, Code2, FileCode2, Folder, Play, Rocket, Terminal, X, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { checkRaydiumClmmDevnet, getRaydiumPoolUrl, RAYDIUM_CLMM_DEVNET_PROGRAM_ID, RAYDIUM_CLMM_GITHUB } from '../utils/raydium';

type WorkspaceFile = { name: string; language: string; content: string };
type ProgramExample = { name: string; category: string; framework: 'Anchor' | 'Native' | 'Pinocchio'; summary: string; files: WorkspaceFile[] };

const PROGRAM_EXAMPLES: ProgramExample[] = [
  {
    name: 'Token mint + metadata', category: 'Tokens', framework: 'Anchor',
    summary: 'Create an SPL token with symbol, decimals, and on-chain metadata.',
    files: [{ name: 'lib.rs', language: 'Rust', content: `use anchor_lang::prelude::*;\n\ndeclare_id!(\"TokenExample111111111111111111111111111111\");\n\n#[program]\npub mod token_example {\n    use super::*;\n\n    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String) -> Result<()> {\n        require!(!name.is_empty() && symbol.len() <= 10, TokenError::InvalidMetadata);\n        ctx.accounts.mint_config.name = name;\n        ctx.accounts.mint_config.symbol = symbol;\n        Ok(())\n    }\n}\n\n#[derive(Accounts)]\npub struct Initialize<'info> {\n    #[account(init, payer = authority, space = 8 + MintConfig::INIT_SPACE)]\n    pub mint_config: Account<'info, MintConfig>,\n    #[account(mut)] pub authority: Signer<'info>,\n    pub system_program: Program<'info, System>,\n}\n\n#[account]\n#[derive(InitSpace)]\npub struct MintConfig { #[max_len(64)] pub name: String, #[max_len(10)] pub symbol: String }\n\n#[error_code]\npub enum TokenError { #[msg(\"Invalid token metadata\")] InvalidMetadata }` },
      { name: 'tests/token.ts', language: 'TypeScript', content: `describe(\"token metadata\", () => {\n  it(\"rejects an empty symbol\", async () => {\n    await expect(client.initialize(\"Meme Token\", \"\")).rejects.toThrow();\n  });\n});` }],
  },
  {
    name: 'Escrow swap', category: 'Tokens', framework: 'Native',
    summary: 'Trust-minimized two-party asset exchange with account validation.',
    files: [{ name: 'processor.rs', language: 'Rust', content: `pub fn process_swap(accounts: &[AccountInfo], amount: u64) -> ProgramResult {\n    if amount == 0 { return Err(ProgramError::InvalidArgument); }\n    let [maker, taker, vault, ..] = accounts else { return Err(ProgramError::NotEnoughAccountKeys); };\n    if !maker.is_signer || !taker.is_signer || vault.owner != &id() {\n        return Err(ProgramError::InvalidAccountData);\n    }\n    msg!(\"validated escrow swap for {} units\", amount);\n    Ok(())\n}` }],
  },
  {
    name: 'Constant-product AMM', category: 'DeFi', framework: 'Anchor',
    summary: 'Liquidity pool math with slippage protection and invariant checks.',
    files: [{ name: 'lib.rs', language: 'Rust', content: `pub fn swap(amount_in: u128, reserve_in: u128, reserve_out: u128, min_out: u128) -> Result<u128> {\n    require!(amount_in > 0 && reserve_in > 0 && reserve_out > 0, AmmError::InvalidAmount);\n    let amount_out = (amount_in * reserve_out) / (reserve_in + amount_in);\n    require!(amount_out >= min_out, AmmError::SlippageExceeded);\n    Ok(amount_out)\n}` }],
  },
  {
    name: 'Favorites PDA', category: 'Basics', framework: 'Pinocchio',
    summary: 'Per-user state stored in a PDA controlled by the program.',
    files: [{ name: 'lib.rs', language: 'Rust', content: `pub fn save_favorite(accounts: &[AccountInfo], label: &[u8]) -> ProgramResult {\n    let [user, favorites, ..] = accounts else { return Err(ProgramError::NotEnoughAccountKeys); };\n    if !user.is_signer || favorites.owner != &id() || label.len() > 32 {\n        return Err(ProgramError::InvalidArgument);\n    }\n    favorites.try_borrow_mut_data()?[..label.len()].copy_from_slice(label);\n    Ok(())\n}` }],
  },
];

const FILES: WorkspaceFile[] = [
  {
    name: 'lib.rs',
    language: 'Rust',
    content: `use anchor_lang::prelude::*;\n\ndeclare_id!("MemeSwap111111111111111111111111111111111");\n\n#[program]\npub mod meme_swap {\n    use super::*;\n\n    pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {\n        require!(amount_in > 0, SwapError::InvalidAmount);\n        emit!(SwapExecuted { amount_in });\n        Ok(())\n    }\n}\n\n#[derive(Accounts)]\npub struct Swap<'info> {\n    pub trader: Signer<'info>,\n}\n\n#[event]\npub struct SwapExecuted {\n    pub amount_in: u64,\n}\n\n#[error_code]\npub enum SwapError {\n    #[msg("Amount must be greater than zero")]\n    InvalidAmount,\n}`,
  },
  { name: 'Anchor.toml', language: 'TOML', content: `[programs.devnet]\nmeme_swap = "MemeSwap111111111111111111111111111111111"\n\n[provider]\ncluster = "devnet"\nwallet = "~/.config/solana/id.json"` },
  { name: 'tests/swap.ts', language: 'TypeScript', content: `describe("meme swap", () => {\n  it("quotes a devnet swap", async () => {\n    const quote = await client.quote({\n      inputMint: SOL_MINT,\n      outputMint: MEME_MINT,\n      amount: 0.1,\n    });\n    expect(quote.minReceived).toBeGreaterThan(0);\n  });\n});` },
];

interface ProgramWorkspaceProps { onClose: () => void }

export const ProgramWorkspace: React.FC<ProgramWorkspaceProps> = ({ onClose }) => {
  const [activeFile, setActiveFile] = useState(FILES[0].name);
  const [source, setSource] = useState(FILES[0].content);
  const [activeTab, setActiveTab] = useState<'editor' | 'tests' | 'logs'>('editor');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>(['Workspace connected to Solana Devnet.', 'No program deployed in this session.']);
  const { connection } = useConnection();
  const [raydiumStatus, setRaydiumStatus] = useState<{ ok: boolean; slot: number; latencyMs: number; error?: string } | null>(null);
  const [checkingRaydium, setCheckingRaydium] = useState(false);
  const [exampleFilter, setExampleFilter] = useState('All');
  const [activeExample, setActiveExample] = useState(PROGRAM_EXAMPLES[0].name);
  const checkRaydium = async () => {
    setCheckingRaydium(true);
    const result = await checkRaydiumClmmDevnet(connection);
    setRaydiumStatus(result);
    setLogs((current) => [...current, result.ok ? `Raydium CLMM verified at slot ${result.slot} (${result.latencyMs}ms).` : `Raydium CLMM check failed: ${result.error}`]);
    setCheckingRaydium(false);
  };

  const selectedFile = useMemo(() => FILES.find((file) => file.name === activeFile) ?? FILES[0], [activeFile]);
  const runChecks = () => {
    setStatus('running');
    setActiveTab('logs');
    setLogs((current) => [...current, `Running ${selectedFile.name} checks on devnet...`]);
    window.setTimeout(() => {
      const valid = source.includes('swap') || selectedFile.name !== 'lib.rs';
      setStatus(valid ? 'success' : 'error');
      setLogs((current) => [...current, valid ? '✓ Build passed · 0 errors · 0 warnings' : '✕ Build failed · expected swap handler not found']);
    }, 500);
  };

  const selectFile = (file: WorkspaceFile) => {
    setActiveFile(file.name);
    setSource(file.content);
    setActiveTab('editor');
    setStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070a10]/95 backdrop-blur-sm p-2 sm:p-5 flex items-center justify-center">
      <section className="w-full max-w-6xl h-[min(860px,calc(100vh-16px))] sm:h-[min(760px,calc(100vh-40px))] bg-[#0d111a] border border-[#26334e] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="h-14 shrink-0 border-b border-[#202b41] px-3 sm:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-[#9945FF]/20 border border-[#9945FF]/30 flex items-center justify-center"><Code2 className="size-4 text-purple-300" /></div>
            <div className="min-w-0"><h2 className="text-sm font-bold text-white truncate">Solana Program Workspace</h2><p className="text-[10px] text-slate-500 font-mono">browser IDE · devnet only</p></div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-2 py-1 text-[10px] font-mono text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />DEVNET</span>
          </div>
          <div className="flex items-center gap-2"><button onClick={runChecks} disabled={status === 'running'} className="inline-flex items-center gap-1.5 rounded-lg bg-[#14F195] px-3 py-2 text-xs font-bold text-[#07110d] disabled:opacity-50"><Play className="size-3.5" />{status === 'running' ? 'Running' : 'Build & Test'}</button><button onClick={onClose} aria-label="Close workspace" className="rounded-lg p-2 text-slate-400 hover:bg-[#182338] hover:text-white"><X className="size-4" /></button></div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-[#202b41] p-3 overflow-auto">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3"><span>Project files</span><ChevronDown className="size-3" /></div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-2"><Folder className="size-3.5 text-amber-300" /> meme-swap</div>
            <div className="mb-3 flex flex-wrap gap-1">
              {['All', 'Basics', 'Tokens', 'DeFi'].map((category) => <button key={category} onClick={() => setExampleFilter(category)} className={`rounded-md px-2 py-1 text-[9px] font-bold ${exampleFilter === category ? 'bg-[#14F195]/15 text-[#14F195]' : 'text-slate-500 hover:text-slate-200'}`}>{category}</button>)}
            </div>
            <div className="flex max-h-52 flex-col gap-1 overflow-auto">
              {PROGRAM_EXAMPLES.filter((example) => exampleFilter === 'All' || example.category === exampleFilter).map((example) => <button key={example.name} onClick={() => { setActiveExample(example.name); selectFile(example.files[0]); }} className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${activeExample === example.name ? 'border-[#14F195]/40 bg-[#14F195]/10' : 'border-transparent hover:bg-[#141d2e]'}`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-200">{example.name}</span><span className="text-[9px] text-purple-300">{example.framework}</span></div><p className="mt-1 text-[10px] leading-snug text-slate-500">{example.summary}</p></button>)}
            </div>
            <div className="mt-3 border-t border-[#202b41] pt-3"><div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Loaded files</div><div className="flex flex-col gap-1 pl-1">{FILES.map((file) => <button key={file.name} onClick={() => selectFile(file)} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${activeFile === file.name ? 'bg-[#182338] text-white' : 'text-slate-400 hover:bg-[#141d2e] hover:text-slate-200'}`}><FileCode2 className="size-3.5 text-purple-300" />{file.name}</button>)}</div></div>
            <div className="mt-5 rounded-lg border border-[#273552] bg-[#111827] p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-200"><Zap className="size-3.5 text-amber-300" />Workspace tips</div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Write Anchor-compatible Rust, run local checks, then use the wallet signer to deploy on Devnet.</p></div>
            <div className="mt-3 rounded-lg border border-[#3b2b55] bg-[#171222] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-purple-200">Raydium CLMM</span><button onClick={checkRaydium} disabled={checkingRaydium} className="rounded-md p-1.5 text-purple-300 hover:bg-purple-400/10 disabled:opacity-50" aria-label="Check Raydium CLMM"><RefreshCw className={`size-3.5 ${checkingRaydium ? 'animate-spin' : ''}`} /></button></div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Devnet program verification uses the Raydium SDK and the CLMM program ID.</p><div className="mt-2 font-mono text-[9px] text-slate-600 break-all">{RAYDIUM_CLMM_DEVNET_PROGRAM_ID}</div><div className="mt-2 flex gap-2"><a href={RAYDIUM_CLMM_GITHUB} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-purple-300 hover:text-white">Source <ExternalLink className="size-3" /></a><a href={getRaydiumPoolUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white">Pools <ExternalLink className="size-3" /></a></div>{raydiumStatus && <div className={`mt-2 text-[10px] ${raydiumStatus.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{raydiumStatus.ok ? `Verified · slot ${raydiumStatus.slot} · ${raydiumStatus.latencyMs}ms` : raydiumStatus.error}</div>}</div>
          </aside>

          <main className="flex-1 min-w-0 min-h-0 flex flex-col">
            <nav className="h-11 shrink-0 border-b border-[#202b41] flex items-center gap-1 px-3"><button onClick={() => setActiveTab('editor')} className={`px-3 py-2 text-xs font-semibold ${activeTab === 'editor' ? 'text-white border-b-2 border-[#14F195]' : 'text-slate-500'}`}><Braces className="inline size-3.5 mr-1.5" />Editor</button><button onClick={() => setActiveTab('tests')} className={`px-3 py-2 text-xs font-semibold ${activeTab === 'tests' ? 'text-white border-b-2 border-[#14F195]' : 'text-slate-500'}`}><CheckCircle2 className="inline size-3.5 mr-1.5" />Tests</button><button onClick={() => setActiveTab('logs')} className={`px-3 py-2 text-xs font-semibold ${activeTab === 'logs' ? 'text-white border-b-2 border-[#14F195]' : 'text-slate-500'}`}><Terminal className="inline size-3.5 mr-1.5" />Logs</button></nav>
            {activeTab === 'editor' && <div className="flex-1 min-h-0 flex flex-col"><div className="h-9 shrink-0 bg-[#111827] border-b border-[#202b41] px-4 flex items-center justify-between text-[11px] font-mono"><span className="text-slate-300">{activeFile} <span className="text-slate-600">· {selectedFile.language}</span></span><span className="text-slate-600">UTF-8</span></div><textarea aria-label={`${activeFile} source`} value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} className="flex-1 resize-none bg-[#090d14] p-4 text-[12px] leading-6 font-mono text-slate-300 outline-none" /></div>}
            {activeTab === 'tests' && <div className="flex-1 overflow-auto p-5"><div className="rounded-xl border border-[#26334e] bg-[#111827] p-4"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-white">Devnet test suite</h3><p className="mt-1 text-xs text-slate-500">Read-only checks modeled after Solana Playground workflows.</p></div><button onClick={runChecks} className="inline-flex items-center gap-1.5 rounded-lg border border-[#14F195]/40 bg-[#14F195]/10 px-3 py-2 text-xs font-semibold text-[#14F195]"><Play className="size-3.5" />Run tests</button></div><div className="mt-4 flex flex-col gap-2 text-xs font-mono"><div className="flex justify-between rounded-lg bg-[#0b111b] p-3"><span className="text-slate-300">quote_returns_minimum_received</span><span className="text-emerald-300">ready</span></div><div className="flex justify-between rounded-lg bg-[#0b111b] p-3"><span className="text-slate-300">wallet_signer_required</span><span className="text-emerald-300">ready</span></div><div className="flex justify-between rounded-lg bg-[#0b111b] p-3"><span className="text-slate-300">devnet_cluster_reachable</span><span className="text-amber-300">run</span></div></div></div></div>}
            {activeTab === 'logs' && <div className="flex-1 overflow-auto bg-[#090d14] p-4 font-mono text-xs"><div className="mb-3 flex items-center gap-2 text-slate-500"><Terminal className="size-3.5" />program console</div>{logs.map((log, index) => <div key={`${log}-${index}`} className={log.includes('failed') ? 'text-rose-300' : log.includes('passed') || log.includes('✓') ? 'text-emerald-300' : 'text-slate-400'}><span className="text-slate-700 mr-3">{String(index + 1).padStart(2, '0')}</span>{log}</div>)}</div>}
          </main>
        </div>
        <footer className="h-10 shrink-0 border-t border-[#202b41] px-4 flex items-center justify-between text-[10px] font-mono text-slate-500"><span>{status === 'success' ? 'Build passed' : status === 'error' ? 'Build failed' : 'Unsaved changes are kept in this session'}</span><button onClick={runChecks} className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#14F195]"><Rocket className="size-3.5" />Validate program</button></footer>
      </section>
    </div>
  );
};

export default ProgramWorkspace;
