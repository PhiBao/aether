"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useState } from "react";

const MCP_TOOLS = [
  {
    name: "fetch_signal",
    description: "Get the current AI swarm signal for a cryptocurrency pair",
    params: { symbol: "Trading pair (e.g. BTCUSDT, ETHUSDT)" },
    returns: { direction: "LONG | SHORT | HOLD", confidence: "0-100%", strength: "0-100%", votes: "6 strategy votes" },
  },
  {
    name: "fetch_all_signals",
    description: "Fetch live signals across all tracked perp pairs",
    params: {},
    returns: "Array of signal objects for BTC, ETH, SOL, DOGE, XRP, TON, PEPE, WIF, BONK, FARTCOIN",
  },
  {
    name: "fetch_sentiment",
    description: "Get Elfa AI social sentiment data for a symbol",
    params: { symbol: "Trading pair" },
    returns: { score: "-1 to 1", confidence: "0-100%", mentionCount: "social mentions", bullishRatio: "0-100%" },
  },
  {
    name: "fetch_klines",
    description: "Get historical candlestick data from Bybit",
    params: { symbol: "Trading pair", interval: "1|5|15|60|240|D", limit: "Number of candles (max 200)" },
    returns: "Array of OHLCV candles with timestamp",
  },
  {
    name: "vote_signal",
    description: "Cast a crowd vote on a signal (bull or bear)",
    params: { symbol: "Trading pair", direction: "bull | bear" },
    returns: { bull: "count", bear: "count", total: "count" },
  },
  {
    name: "fetch_leaderboard",
    description: "Get aggregated crowd sentiment across all pairs",
    params: {},
    returns: "Sorted array by total votes with bull/bear ratios",
  },
];

const ON_CHAIN_FUNCTIONS = [
  { contract: "AgentRegistry", function: "registerAgent", purpose: "Mint ERC-8004 soulbound identity" },
  { contract: "SignalLogger", function: "logSignal", purpose: "Write swarm decision to Mantle blockchain" },
  { contract: "SignalLogger", function: "getSignal", purpose: "Read historical signal from on-chain" },
];

export default function MCPDocsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function testTool(toolName: string, params: Record<string, string>) {
    try {
      let url = "/api/bot/cycle";
      if (toolName === "fetch_signal" && params.symbol) {
        url += `?symbol=${params.symbol.toUpperCase()}`;
      } else if (toolName === "vote_signal" && params.symbol && params.direction) {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: params.symbol.toUpperCase(), vote: params.direction }),
        });
        setTestResult(JSON.stringify(await res.json(), null, 2));
        return;
      } else if (toolName === "fetch_leaderboard") {
        const res = await fetch("/api/leaderboard");
        setTestResult(JSON.stringify(await res.json(), null, 2));
        return;
      }

      const res = await fetch(url);
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-cyan text-lg font-bold tracking-wider mb-2">[ MCP TOOLS ]</h1>
          <p className="text-xs text-gray-500">
            Model Context Protocol tools exposed by AETHER. Connect AI assistants, build agents, or integrate into your workflow.
          </p>
        </div>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ ON-CHAIN AI FUNCTIONS ]</h2>
          <p className="text-xs text-gray-400 mb-4">
            AETHER satisfies the on-chain AI requirement — every swarm signal is logged to the SignalLogger contract on Mantle.
          </p>
          <div className="space-y-2">
            {ON_CHAIN_FUNCTIONS.map((fn, i) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                <div>
                  <span className="text-neonGreen">{fn.contract}</span>
                  <span className="text-gray-400"> → </span>
                  <span className="text-gray-200">{fn.function}</span>
                </div>
                <span className="text-gray-500">{fn.purpose}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-neonGreen/10 border border-neonGreen text-[10px] text-neonGreen">
            ✓ AI-powered function callable on-chain: Swarm consensus → logSignal() → Mantle blockchain
          </div>
        </section>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ AVAILABLE TOOLS ]</h2>
          <div className="space-y-4">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-200 font-bold text-sm">{tool.name}</span>
                  <button
                    onClick={() => { setActiveTool(activeTool === tool.name ? null : tool.name); setTestResult(null); }}
                    className="text-[10px] text-cyan hover:underline"
                  >
                    {activeTool === tool.name ? "[ CLOSE ]" : "[ TEST ]"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">{tool.description}</p>

                {activeTool === tool.name && (
                  <div className="mt-3 space-y-3">
                    <div className="text-[10px] text-gray-600">
                      <div className="font-bold mb-1">PARAMS:</div>
                      {Object.entries(tool.params).map(([k, v]) => (
                        <div key={k} className="ml-2">• {k}: {v}</div>
                      ))}
                      {Object.keys(tool.params).length === 0 && <span className="ml-2">none</span>}
                    </div>

                    <div className="text-[10px] text-gray-600">
                      <div className="font-bold mb-1">RETURNS:</div>
                      {Object.entries(tool.returns).map(([k, v]) => (
                        <div key={k} className="ml-2">• {k}: {v}</div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {Object.keys(tool.params).length > 0 ? (
                        <button
                          onClick={() => testTool(tool.name, { symbol: "BTCUSDT" })}
                          className="px-3 py-1 border border-cyan text-cyan text-[10px] hover:bg-cyan hover:text-black"
                        >
                          [ RUN BTCUSDT ]
                        </button>
                      ) : (
                        <button
                          onClick={() => testTool(tool.name, {})}
                          className="px-3 py-1 border border-cyan text-cyan text-[10px] hover:bg-cyan hover:text-black"
                        >
                          [ RUN ]
                        </button>
                      )}
                    </div>

                    {testResult && (
                      <pre className="mt-2 p-2 bg-darkBg text-[10px] text-gray-300 overflow-x-auto max-h-40">
                        {testResult}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ MCP CLIENT CONFIGURATION ]</h2>
          <pre className="text-xs text-gray-400 bg-darkBg p-3 overflow-x-auto">
{`{
  "mcpServers": {
    "aether": {
      "command": "npx",
      "args": ["tsx", "path/to/mcp-server/index.ts"]
    }
  }
}`}
          </pre>
          <p className="text-[10px] text-gray-600 mt-3">
            Add this to your Claude Desktop or MCP-compatible AI client config. The server connects to the AETHER API at runtime.
          </p>
        </section>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ CONNECTION ]</h2>
          <div className="text-xs text-gray-500 space-y-1">
            <div>AETHER_API_URL: Set via environment variable (default: http://localhost:3000)</div>
            <div>Network: Mantle Sepolia (Chain ID: 5003)</div>
            <div>RPC: https://mantle-sepolia.g.alchemy.com/v2/...</div>
          </div>
        </section>
      </div>
    </TerminalLayout>
  );
}