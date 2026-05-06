# AETHER — AI Swarm Signal Terminal

> A gamified, shareable AI trading signal terminal powered by 6-strategy swarm consensus, Bybit market data, and Elfa social sentiment. Built on Mantle Network.

---

## Vision

**AETHER** exists because retail traders are drowning in noise. Every day, millions of signals flood Twitter, Discord, and Telegram — contradictory, overwhelming, and often wrong.

Our vision: **A decentralized intelligence layer that turns noise into signal.**

AETHER is not another trading bot. It's a **consensus engine** that aggregates independent strategies, surfaces crowd sentiment, and highlights where the crowd is wrong. Every signal is auditable, verifiable, and recorded on-chain.

---

## Product Overview

AETHER is a **signal intelligence terminal** — a tool for traders who want data-driven signals without the noise.

### Core Features

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| **Live Signal Feed** | 10 perp pairs analyzed in real-time | See what the swarm thinks, updated every 30s |
| **6-Strategy Swarm** | 6 independent agents vote on each signal | Consensus > individual opinion |
| **Crowd Voting** | Anyone can vote bull/bear on any signal | Surface retail sentiment |
| **Disagreement Flags** | Alerts when crowd disagrees with AI | Contrarian opportunities |
| **Shareable Cards** | One-click copy for social sharing | Distribution engine |
| **On-Chain Identity** | ERC-8004 soulbound IDs on Mantle | Verifiable reputation |
| **MCP Tools** | AI-accessible API for all functions | Build agents, integrations |

---

## Technical Architecture

### Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                │
├─────────────────────────────────────────────────────────────────────┤
│  Bybit V5 API          │  Elfa AI API         │  Mantle RPC        │
│  • Klines (OHLCV)      │  • Social sentiment  │  • Block data      │
│  • Funding rates        │  • Mention counts    │  • Contract calls  │
│  • Ticker prices       │  • Bull/bear ratio   │  • Transaction logs│
└────────────────────────┴──────────────────────┴────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SWARM ENGINE                                  │
├─────────────────────────────────────────────────────────────────────┤
│  6 Independent Strategy Agents running in parallel:                 │
│                                                                         │
│  1. TREND_HUNTER_01    │ EMA crosses, trend alignment              │
│  2. MEAN_REVERT_02     │ Bollinger band reversions                 │
│  3. MOMENTUM_BOT_03    │ MACD/RSI momentum shifts                    │
│  4. SR_BOUNCE_04       │ Support/resistance bounce                  │
│  5. VOLUME_SNIFFER_05  │ Volume spike breakouts                     │
│  6. SENTIMENT_ORACLE_06│ Elfa sentiment + funding rate bias         │
│                                                                         │
│  Each agent votes: BUY (-1 to 1) with confidence (0-100%)            │
│  Final signal = weighted average of all 6 votes                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        OUTPUT LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Signal Object:                                                     │
│  {                                                                 │
│    symbol: "BTCUSDT",                                             │
│    direction: "LONG",           // Consensus direction               │
│    confidence: 0.78,           // Weighted confidence 0-100%       │
│    strength: 0.65,            // Signal strength 0-100%            │
│    vibeScore: 0.42,            // Crowd vs AI alignment            │
│    votes: [...6 strategies],  // Individual agent votes            │
│    meta: {                    // Context                           │
│      sentimentScore: 0.35,     // Elfa score -1 to 1               │
│      fundingRate: 0.0001,      // Bybit funding rate               │
│      mentionCount: 4523        // Social mentions                  │
│    }                                                                  │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### On-Chain Verification

**Every signal is logged to the Mantle blockchain via SignalLogger contract:**

```solidity
function logSignal(
    address _agent,
    string _symbol,
    int8 _direction,        // 1=LONG, -1=SHORT, 0=HOLD
    uint16 _confidenceBps, // 0-10000 (basis points)
    int256 _vibeScore,     // Crowd alignment -1 to 1
    bytes32 _strategyHash   // Hash of strategy combination used
) returns (uint256 signalId)
```

This creates an **immutable, auditable trail** of AI decisions — critical for:
- Transparency with users
- Hackathon judging (verifiable on-chain activity)
- Future reputation systems

---

## How It Works

### 1. Signal Generation (Every 30 seconds)

1. Fetch latest 100 candles for each of 10 perp pairs from Bybit
2. Fetch real-time sentiment from Elfa for each symbol
3. Fetch current funding rates
4. Run each of 6 strategy agents against the data
5. Aggregate votes into final consensus signal
6. Cache result for 60 seconds (prevent API spam)

### 2. Crowd Voting

1. User visits feed, sees signals + current vote counts
2. User clicks BULL or BEAR on any signal
3. Vote stored in-memory (localStorage for user persistence)
4. Votes feed into leaderboard aggregation

### 3. Disagreement Detection

```typescript
function getDisagreement(aiDirection, crowdRatio):
  if ai == LONG and crowdBearRatio > 60% -> STRONG_DISAGREE
  if ai == LONG and crowdBearRatio > 50% -> DISAGREE
  if ai == SHORT and crowdBullRatio > 60% -> STRONG_DISAGREE
  ...
```

This flags potential **contrarian opportunities** — when the AI sees something the crowd doesn't.

---

## MCP (Model Context Protocol)

AETHER exposes all core functions via MCP, enabling AI assistants and agents to interact with the swarm:

| Tool | Description |
|------|-------------|
| `fetch_signal` | Get signal for a specific symbol |
| `fetch_all_signals` | Get all 10 active signals |
| `fetch_sentiment` | Get Elfa sentiment for symbol |
| `fetch_klines` | Get historical candle data |
| `vote_signal` | Cast a crowd vote |
| `fetch_leaderboard` | Get aggregated sentiment map |

### Integration

```json
{
  "mcpServers": {
    "aether": {
      "command": "npx",
      "args": ["tsx", "path/to/mcp-server/index.ts"]
    }
  }
}
```

---

## Smart Contracts (Mantle Sepolia)

| Contract | Address | Purpose | Verified |
|----------|---------|---------|----------|
| **AgentRegistry** | `0x6792E51FBD24f9315282BD5b6c5E713dCc779C69` | ERC-8004 soulbound agent identity | [✓](https://sepolia.mantlescan.xyz/address/0x6792E51FBD24f9315282BD5b6c5E713dCc779C69) |
| **SignalLogger** | `0xc6168fa5153E7AF6aFf0013D99A2B8D9670a1454` | Append-only signal log | [✓](https://sepolia.mantlescan.xyz/address/0xc6168fa5153E7AF6aFf0013D99A2B8D9670a1454) |
| **StrategyVault** | `0xD4f72d31D66cA11Cdfd428cDc08B438D2681362B` | Collateral vault | [✓](https://sepolia.mantlescan.xyz/address/0xD4f72d31D66cA11Cdfd428cDc08B438D2681362B) |

---

## GTM Strategy

### Phase 1: Hackathon & Community (Now)
- Build initial user base through demo videos
- Shareable signal cards drive organic reach
- Crowd voting creates engagement loop
- On-chain activity proves technical capability

### Phase 2: Trader Adoption (Next)
- Target: Discord/Twitter trading communities
- Value prop: "Signal where the crowd is wrong"
- Differentiation: Not another bot — a consensus engine with transparency

### Phase 3: Agent Ecosystem (Next)
- MCP opens platform for third-party agents
- Developer integrations, strategy marketplaces
- On-chain reputation system for agent performance

### Revenue Model (Future)
- Premium tier: Advanced strategies, faster signals
- API access for developers
- Agent marketplace fees

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Wallet** | wagmi v2, RainbowKit, WalletConnect |
| **Market Data** | Bybit V5 API (free, public) |
| **Sentiment** | Elfa AI API |
| **Contracts** | Solidity 0.8.24, OpenZeppelin v5, Foundry |
| **Network** | Mantle Sepolia → Mantle Mainnet |

---

## Deployment

```bash
# Frontend
cd web
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_WC_PROJECT_ID
vercel --prod

# Smart Contracts
cd contracts
forge build
forge create --rpc-url $MANTLE_RPC --private-key $PK ...
```

---

## Verification Checklist

- [x] AI-powered function callable on-chain → `SignalLogger.logSignal()` logs every swarm decision
- [x] Deployed on Mantle Network
- [x] All 3 contracts verified on Mantle Explorer
- [x] Open-source repo with MIT License
- [x] Frontend deployed to Vercel

---

## License

MIT
