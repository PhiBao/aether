# AGENTS.md

## Quick Start

### Smart Contracts
- Framework: Foundry
- Solidity: 0.8.24
- Run tests: `cd contracts && forge test -vvv`
- Deploy script: `contracts/script/Deploy.s.sol`

### Web App
- Framework: Next.js 14 App Router
- Styling: Tailwind CSS
- Wallet: wagmi + RainbowKit
- Run dev: `cd web && npm run dev`

---

## On-Chain AI Functionality

**Requirement: At least one AI-powered function is callable on-chain**

AETHER satisfies this through the **SignalLogger** contract:

```solidity
function logSignal(
    address _agent,           // Swarm orchestrator address
    string _symbol,           // Trading pair (e.g., "BTCUSDT")
    int8 _direction,         // 1 = LONG, -1 = SHORT, 0 = HOLD
    uint16 _confidenceBps,    // Confidence in basis points (0-10000)
    int256 _vibeScore,       // Crowd sentiment alignment (-1 to 1)
    bytes32 _strategyHash     // Hash of which strategies voted how
) returns (uint256 signalId);
```

Every time the swarm generates a signal:
1. The API calls `logSignal()` on Mantle Sepolia
2. A unique `signalId` is emitted
3. The signal is permanently recorded on-chain
4. Anyone can query historical signals via `getSignal(signalId)`

---

## Swarm Engine Technical Details

### Consensus Algorithm

Each of the 6 agents returns:
```typescript
{
  strategy: string,      // e.g., "trend_following"
  signal: number,        // -1 (SELL) to 1 (BUY)
  confidence: number,    // 0 to 1
  sl?: number,           // Stop loss (optional)
  tp?: number            // Take profit (optional)
}
```

**Final signal calculation:**

```typescript
// Weighted average of all votes
const weightedSum = votes.reduce((sum, v) => sum + v.signal * v.confidence, 0);
const totalWeight = votes.reduce((sum, v) => sum + v.confidence, 0);
const consensusSignal = weightedSum / totalWeight;

// Direction mapping
if (consensusSignal > 0.2) direction = "LONG";
else if (consensusSignal < -0.2) direction = "SHORT";
else direction = "HOLD";

// Confidence = how much the agents agree
const stdDev = calculateStdDev(votes.map(v => v.signal));
confidence = 1 - Math.min(stdDev, 1);
```

### Sentiment Bias

Elfa sentiment score (-1 to 1) is added as a bias term:
```typescript
finalSignal = (weightedSum / totalWeight) + (sentimentScore * 0.15);
```

This ensures the swarm "hears" social sentiment without letting it dominate.

### Funding Rate Adjustment

If funding rate is excessively high (> 0.01%), the signal strength is reduced:
```typescript
if (fundingRate > 0.01) {
  strength *= 0.8; // Cap strength during high funding
}
```

---

## Pages

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Live AI signal feed + crowd voting | No |
| `/leaderboard` | AI vs Crowd sentiment map | No |
| `/signal/[symbol]` | Shareable signal card with strategy breakdown | No |
| `/agents` | Swarm engine + mint ERC-8004 identity | Yes (wallet) |
| `/docs/mcp` | MCP tools documentation + testing | No |
| `/trade` | Roadmap — DEX integration | No |
| `/positions` | Roadmap — portfolio tracking | No |

---

## Data Sources

| Source | Endpoint | Data |
|--------|----------|------|
| **Bybit V5** | `api.bybit.com/v5/market/kline` | OHLCV candles |
| **Bybit V5** | `api.bybit.com/v5/market/tickers` | Funding rates |
| **Elfa AI** | `api.elfa.ai/v1/sentiment` | Social sentiment scores |

---

## Security Checklist

Before every commit, verify:
1. All external calls have ReentrancyGuard
2. No unchecked sends without success verification
3. AgentRegistry transfers are disabled (soulbound)
4. SignalLogger is append-only
5. Tests pass: `forge test`

---

## Deployed Contracts (Mantle Sepolia)

| Contract | Address | ABI |
|----------|---------|-----|
| **AgentRegistry** | `0x6792E51FBD24f9315282BD5b6c5E713dCc779C69` | ERC-8004 |
| **SignalLogger** | `0xc6168fa5153E7AF6aFf0013D99A2B8D9670a1454` | Signal logging |
| **StrategyVault** | `0xD4f72d31D66cA11Cdfd428cDc08B438D2681362B` | Collateral |

**Authorization:** StrategyVault is authorized as updater on both AgentRegistry and SignalLogger.

---

## MCP Tools

| Tool | Endpoint | Returns |
|------|----------|---------|
| `fetch_signal` | `/api/bot/cycle?symbol=X` | Signal object |
| `fetch_all_signals` | `/api/bot/cycle` | Array of signals |
| `fetch_sentiment` | Via signal meta | Score, confidence |
| `vote_signal` | `/api/votes` POST | Vote counts |
| `fetch_leaderboard` | `/api/leaderboard` | Aggregated votes |

---

## Scripts

```bash
# Seed demo agents on Mantle Sepolia
cd web && DEPLOYER_PK=0x... npx tsx scripts/seed-agents.ts
```

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# Optional (fallback to mock data if not set)
ELFA_API_KEY=your_elfa_api_key
```

---

## Consumer Features

1. **Public Signal Feed** — No wallet required to view signals
2. **Crowd Voting** — 🐂 / 🐻 vote on each signal (localStorage + in-memory)
3. **Disagreement Flags** — Highlights where crowd contradicts AI
4. **Shareable Cards** — `/signal/BTCUSDT` with one-click copy for Twitter/X
5. **Live Sentiment Map** — Rank symbols by AI vs crowd divergence
6. **Gamified UI** — Streaks, confidence scores, strategy breakdowns