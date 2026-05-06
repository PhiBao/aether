#!/usr/bin/env node
/**
 * AETHER MCP Server
 * Model Context Protocol server exposing AETHER tools to AI assistants
 * 
 * Usage:
 *   npx tsx mcp-server/index.ts
 * 
 * Or configure in Claude Desktop:
 *   {
 *     "mcpServers": {
 *       "aether": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/mcp-server/index.ts"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = process.env.AETHER_API_URL || "http://localhost:3000";

const server = new Server(
  {
    name: "aether-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_signal",
        description: "Fetch the current AI swarm signal for a cryptocurrency symbol",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "Trading pair symbol, e.g. BTCUSDT" },
          },
          required: ["symbol"],
        },
      },
      {
        name: "fetch_all_signals",
        description: "Fetch all active signals across all tracked pairs",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "fetch_sentiment",
        description: "Fetch Elfa social sentiment for a symbol",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "Trading pair symbol" },
          },
          required: ["symbol"],
        },
      },
      {
        name: "fetch_klines",
        description: "Fetch Bybit kline data for a symbol",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            interval: { type: "string", default: "60" },
            limit: { type: "number", default: 100 },
          },
          required: ["symbol"],
        },
      },
      {
        name: "vote_signal",
        description: "Cast a bull or bear vote on a signal",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            direction: { type: "string", enum: ["bull", "bear"] },
          },
          required: ["symbol", "direction"],
        },
      },
      {
        name: "fetch_leaderboard",
        description: "Get the current crowd sentiment leaderboard",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "docs://architecture",
        name: "AETHER Architecture",
        description: "High-level system architecture and data flow",
        mimeType: "text/markdown",
      },
      {
        uri: "docs://contracts",
        name: "Smart Contract Addresses",
        description: "Deployed contract addresses on Mantle Sepolia",
        mimeType: "text/markdown",
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri === "docs://architecture") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: `# AETHER Architecture

## Data Flow
1. Bybit V5 API → Real-time klines + funding rates
2. Elfa AI API → Social sentiment scores
3. Swarm Engine → 6 strategy agents vote on signal
4. Consensus → Weighted final signal with confidence
5. Frontend → Public feed with crowd voting
6. Mantle Contracts → Optional on-chain identity + logging

## Stack
- Next.js 14 + Tailwind
- wagmi + RainbowKit
- Foundry (Solidity 0.8.24)
`,
        },
      ],
    };
  }
  if (uri === "docs://contracts") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: `# AETHER Contracts (Mantle Sepolia)

| Contract | Address |
|----------|---------|
| AgentRegistry | 0x6792E51FBD24f9315282BD5b6c5E713dCc779C69 |
| SignalLogger | 0xc6168fa5153E7AF6aFf0013D99A2B8D9670a1454 |
| StrategyVault | 0xD4f72d31D66cA11Cdfd428cDc08B438D2681362B |
`,
        },
      ],
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "fetch_signal": {
        const symbol = (args as any).symbol.toUpperCase();
        const res = await fetch(`${BASE_URL}/api/bot/cycle?symbol=${symbol}`);
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data.signal, null, 2) }],
        };
      }

      case "fetch_all_signals": {
        const res = await fetch(`${BASE_URL}/api/bot/cycle`);
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data.signals, null, 2) }],
        };
      }

      case "fetch_sentiment": {
        const symbol = (args as any).symbol.toUpperCase();
        const res = await fetch(`${BASE_URL}/api/bot/cycle?symbol=${symbol}`);
        const data = await res.json();
        const sentiment = data.signal?.meta;
        return {
          content: [{ type: "text", text: JSON.stringify(sentiment, null, 2) }],
        };
      }

      case "fetch_klines": {
        const { symbol, interval = "60", limit = 100 } = args as any;
        const res = await fetch(
          `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
        );
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data.result?.list?.slice(0, 5), null, 2) }],
        };
      }

      case "vote_signal": {
        const { symbol, direction } = args as any;
        const res = await fetch(`${BASE_URL}/api/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: symbol.toUpperCase(), vote: direction }),
        });
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "fetch_leaderboard": {
        const res = await fetch(`${BASE_URL}/api/leaderboard`);
        const data = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data.leaderboard, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AETHER MCP Server running on stdio");
}

main().catch(console.error);
