# Solana Meme Trading Playground

A fully functional, mobile-responsive web application designed for learning and practising meme-token trading on **Solana Devnet** and a simulated **Constant-Product AMM (Automated Market Maker)** without risking real capital.

---

## 🚀 Key Features

### 1. Dual Operational Modes

* **Practice Trading Mode (Default)**:
  * Operates immediately with zero wallet setup, no test SOL, and no external API dependencies.
  * Configurable starting balance of virtual SOL (defaults to 10.0 SOL with 1-click presets and reset).
  * True constant-product AMM pool engine ($x \times y = k$) with virtual SOL and token reserves.
  * Real-time slippage enforcement, price impact warning curves, and trading fee deductions.
  * Persistent banner: `SIMULATION — NO REAL FUNDS`.

* **Devnet Trading Mode**:
  * Real Solana Devnet connectivity using `@solana/wallet-adapter-react` and `@solana/web3.js`.
  * Dedicated connection to the Solana Devnet cluster (configurable via `VITE_SOLANA_DEVNET_RPC`).
  * Live Devnet SOL balance and SPL token balance inspection.
  * Built-in **Devnet Faucet** button to request 1 Devnet SOL directly into the connected wallet via `requestAirdrop`.
  * Transaction confirmation, pending loading states, and direct links to Solana Devnet Explorer.
  * Strict security: Never requests or stores private keys or seed phrases; never silently switches to mainnet.
  * Persistent banner: `SOLANA DEVNET — TEST FUNDS ONLY`.

### 2. High-Performance Trading Terminal

* **Dashboard & Metrics**:
  * Total Portfolio Value (in SOL and USD estimate).
  * Available SOL Balance.
  * Realized Profit & Loss (from closed and trimmed positions).
  * Unrealized Profit & Loss (from live spot prices).
  * Total Return ROI (%).
* **Interactive Financial Price Chart**:
  * Candlestick and Area chart toggle.
  * Multi-timeframe view (1m, 5m, 15m, 1h, 1d).
  * Volume histogram bars.
  * Hover crosshair displaying Open, High, Low, Close, and Volume.
  * Live AMM reserve ticker ($k$ invariant, SOL reserve $x$, Token reserve $y$, AMM fee).
* **Portfolio Valuation & Daily P&L Analytics Chart Component**:
  * Dual-mode visualization switcher:
    * **Historical Performance (Line / Area Chart)**: Visualizes portfolio equity curve over time against baseline capital, with gradient fills, high/low markers, and hover crosshair displaying exact historical valuation and available SOL balances.
    * **Daily P&L (Bar Chart)**: Visualizes day-by-day net P&L distributions with green bars above the zero-axis for winning days and red bars below for losing days, daily trade counts, and hover metrics.
  * Timeframe filters: 24H, 7D, 14D, and ALL.
  * Summary metrics ribbon: Current Valuation (SOL/USD), Net P&L Return, Win/Loss Days ratio, and Best/Worst Day swing analysis.
  * Multi-view support: Seamlessly switch between Token Price Chart, Portfolio Analytics, or Split-View (both simultaneously).
* **Buy & Sell Interface**:
  * Buy and Sell tabs with quick percentage buttons (25%, 50%, 75%, MAX) and SOL presets (0.1, 0.5, 1, 2 SOL).
  * Real-time AMM quote preview with price impact color-coded warnings (> 5% amber, > 10% rose).
  * Configurable slippage tolerance (0.1%, 0.5%, 1.0%, 3.0%, custom).
  * Confirmation modal before submitting any transaction with complete breakdown of rates, minimum received, and fees.
  * Balance validation: prevents negative numbers, invalid amounts, and insufficient balances.

### 3. Rigorous P&L Calculations

* **Weighted-Average Cost Basis Method**:
  * **Multiple Purchases**: Accumulates total cost and calculates weighted average entry price:
    $$\text{Average Entry Price} = \frac{\text{Total Cost Sol}}{\text{Total Tokens}}$$
  * **Partial Sales**: Calculates realized profit/loss on sold quantity:
    $$\text{Cost of Sold} = \text{Sold Tokens} \times \text{Average Entry Price}$$
    $$\text{Realized P&L} = \text{Net SOL Proceeds} - \text{Cost of Sold}$$
    Remaining cost basis decreases proportionally while unit average entry price is preserved.
  * **Unrealized P&L**:
    $$\text{Unrealized P&L} = (\text{Remaining Tokens} \times \text{Spot Price}) - \text{Remaining Cost Basis}$$

### 4. Devnet SPL Token Mint Creator (Launchpad)

* Accepts token name, symbol, decimals (6, 9, 2, or 0), and initial supply.
* In Devnet mode: Creates a real on-chain SPL Token Mint via `@solana/spl-token` and `@solana/web3.js`, initializes user ATA, and mints supply.
* Provides transaction signature and Solana Devnet Explorer URL.
* Option to initialize and seed a Playground AMM pool with virtual SOL and token reserves so users can trade their new token immediately.

### 5. Automated Mathematical Test Suite

* Built-in interactive test suite modal accessible from the top bar or footer.
* Verifies:
  1. AMM constant-product invariant ($x \cdot y = k$) on buys.
  2. AMM token reserve updates and SOL output on sells.
  3. Trading fee deduction (30 bps / 0.3%).
  4. Weighted-average cost basis after multiple purchases.
  5. Partial sales and realized P&L preservation.
  6. Unrealized P&L and complete position liquidation to zero.
  7. Slippage tolerance protection and pool liquidity exhaustion protection.

---

## 🛠️ Project Architecture

```
/
├── index.html                   # HTML entry point with metadata
├── package.json                 # Dependencies and build scripts
├── vite.config.ts               # Vite configuration with Node Polyfills
├── src/
│   ├── main.tsx                 # React DOM mount point
│   ├── App.tsx                  # Root terminal layout
│   ├── index.css                # Tailwind CSS and terminal styles
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   ├── utils/
│   │   ├── amm.ts               # Constant-product AMM quote math
│   │   ├── pnl.ts               # Weighted-average cost basis & P&L engine
│   │   ├── solana.ts            # Devnet web3 connection, airdrop & SPL minting
│   │   ├── storage.ts           # Local persistence and seeded meme tokens
│   │   └── tests.ts             # Automated mathematical test suite
│   ├── context/
│   │   ├── WalletContextProvider.tsx  # Solana Wallet Adapter for Devnet
│   │   └── TradingContext.tsx         # Unified trading & simulation state
│   └── components/
│       ├── Header.tsx           # Safety banners, mode switch, faucet, wallet
│       ├── DashboardStats.tsx   # Portfolio, SOL balance, Realized & Unrealized P&L
│       ├── PriceChart.tsx       # Candlestick & Area financial chart with volume
│       ├── SwapCard.tsx         # Buy/Sell interface, quotes, slippage & modal
│       ├── TokenWatchlist.tsx   # Searchable token list with 1-click select
│       ├── PositionsTable.tsx   # Active holdings, cost basis, unrealized P&L
│       ├── TradeHistory.tsx     # Transaction ledger with explorer links
│       ├── TokenCreator.tsx     # Devnet SPL mint launchpad
│       ├── TestSuiteModal.tsx   # Unit test runner
│       └── DevnetGuideModal.tsx # Instructions on Devnet, faucet & Phantom setup
```

---

## 💻 Setup & Configuration

### Prerequisites
* Node.js 18+
* A modern browser with Phantom or Solflare wallet extension (optional for Devnet mode; not required for Practice mode).

### Environment Variables
Configure your `.env` (or copy `.env.example`):
```env
# Optional custom Solana Devnet RPC URL (defaults to https://api.devnet.solana.com)
VITE_SOLANA_DEVNET_RPC="https://api.devnet.solana.com"
```

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🔒 Safety & Devnet Best Practices

1. **Test Environment Only**: Devnet SOL and simulated tokens have zero financial value.
2. **Never Enter Seed Phrases**: Neither this app nor any Solana dapp should ever request your seed phrase.
3. **Switch Phantom to Devnet**:
   * Open Phantom -> Settings (gear icon) -> Developer Settings -> Turn on "Testnet Mode" -> Choose "Solana Devnet".
