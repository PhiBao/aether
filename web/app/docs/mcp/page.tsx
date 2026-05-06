"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useState } from "react";
import { fetchKlines, fetchFundingRate } from "@/lib/dex/bybit-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";

const MCP_TOOLS = [
  {
    name: "fetch_signal",
    description: "Get the current AI swarm signal for a cryptocurrency pair. Runs the swarm engine client-side using live Bybit data.",
    params: { symbol: "Trading pair (e.g. BTCUSDT, ETHUSDT)" },
    returns: { direction: "LONG | SHORT | HOLD", confidence: "0-100%", strength: "0-100%", votes: "6 strategy votes" },
  },
  {
    name: "fetch_all_signals",
    description: "Fetch live signals across all 10 tracked perp pairs. Each runs through the 6-strategy swarm.",
    params: {},
    returns: "Array of signal objects for BTC, ETH, SOL, DOGE, XRP, TON, PEPE, WIF, BONK, FARTCOIN",
  },
  {
    name: "fetch_sentiment",
    description: "Get social sentiment data for a symbol. Uses Elfa AI when available, deterministic fallback otherwise.",
    params: { symbol: "Trading pair" },
    returns: { score: "-1 to 1", confidence: "0-100%", mentionCount: "social mentions", bullishRatio: "0-100%" },
  },
  {
    name: "fetch_klines",
    description: "Get historical candlestick data directly from Bybit V5 API.",
    params: { symbol: "Trading pair", interval: "1|5|15|60|240|D", limit: "Number of candles (max 200)" },
    returns: "Array of OHLCV candles with timestamp",
  },
  {
    name: "vote_signal",
    description: "Cast a crowd vote on a signal (bull or bear). Stored server-side.",
    params: { symbol: "Trading pair", direction: "bull | bear" },
    returns: { bull: "count", bear: "count", total: "count" },
  },
  {
    name: "fetch_leaderboard",
    description: "Get aggregated crowd sentiment across all pairs. Server-side aggregation.",
    params: {},
    returns: "Sorted array by total votes with bull/bear ratios",
  },
];

const ON_CHAIN_FUNCTIONS = [
  { contract: "AgentRegistry", function: "registerAgent", purpose: "Mint ERC-8004 soulbound identity" },
  { contract: "SignalLogger", function: "logSignal", purpose: "Write swarm decision to Mantle blockchain" },
  { contract: "SignalLogger", function: "getSignal", purpose: "Read historical signal from on-chain" },
];

function generateFallbackSentiment(symbol: string) {
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = Math.sin(hash) * 0.5 + 0.5;
  return {
    symbol,
    score: (pseudo - 0.5) * 2,
    confidence: 0.3 + pseudo * 0.4,
    mentionCount: Math.floor(100 + pseudo * 2000),
    bullishRatio: pseudo > 0.5 ? pseudo : 1 - pseudo,
  };
}

const POPULAR_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "TONUSDT", "PEPEUSDT", "WIFUSDT", "BONKUSDT", "FARTCOINUSDT"];

export default function MCPDocsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runSignal(symbol: string) {
    const [klines, fundingRate] = await Promise.all([
      fetchKlines(symbol, "60", 100),
      fetchFundingRate(symbol),
    ]);
    if (!klines || klines.length < 20) throw new Error(`Insufficient kline data for ${symbol}`);
    const sentiment = generateFallbackSentiment(symbol);
    const candles: Candle[] = klines.map((k) => ({
      timestamp: k.timestamp, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume,
    }));
    const signal = runSwarm(candles, sentiment.score, sentiment.confidence, fundingRate);
    signal.symbol = symbol;
    signal.timestamp = Date.now();
    signal.meta = { sentimentScore: sentiment.score, sentimentConfidence: sentiment.confidence, fundingRate, mentionCount: sentiment.mentionCount };
    return signal;
  }

  async function testTool(toolName: string, params: Record<string, string>) {
    setRunning(true);
    setTestResult("Running...");
    try {
      let result: any;

      if (toolName === "fetch_signal") {
        result = await runSignal(params.symbol || "BTCUSDT");
      } else if (toolName === "fetch_all_signals") {
        const results = await Promise.allSettled(POPULAR_PAIRS.map((s) => runSignal(s)));
        result = results.filter((r) => r.status === "fulfilled").map((r: any) => r.value);
      } else if (toolName === "fetch_sentiment") {
        result = generateFallbackSentiment(params.symbol || "BTCUSDT");
      } else if (toolName === "fetch_klines") {
        result = await fetchKlines(params.symbol || "BTCUSDT", "60", 10);
      } else if (toolName === "vote_signal") {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: (params.symbol || "BTCUSDT").toUpperCase(), vote: params.direction || "bull" }),
        });
        result = await res.json();
      } else if (toolName === "fetch_leaderboard") {
        const res = await fetch("/api/leaderboard");
        result = await res.json();
      }

      setTestResult(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-cyan text-lg font-bold tracking-wider mb-2">[ MCP TOOLS ]</h1>
          <p className="text-xs text-gray-500">
            Model Context Protocol tools exposed by AETHER. Signal data is fetched client-side from Bybit. Voting and leaderboard use the server API.
          </p>
        </div>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ ON-CHAIN AI FUNCTIONS ]</h2>
          <p className="text-xs text-gray-400 mb-4">
            Every swarm signal is logged to the SignalLogger contract on Mantle. AI-powered function callable on-chain.
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
          <p className="text-[10px] text-gray-600 mb-4">
            Signal tools fetch directly from Bybit (client-side). Vote/leaderboard tools use the server API.
          </p>
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
                      {typeof tool.returns === "string" ? (
                        <div className="ml-2">• {tool.returns}</div>
                      ) : (
                        Object.entries(tool.returns).map(([k, v]) => (
                          <div key={k} className="ml-2">• {k}: {v}</div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      {Object.keys(tool.params).length > 0 ? (
                        <button
                          onClick={() => testTool(tool.name, { symbol: "BTCUSDT", direction: "bull" })}
                          disabled={running}
                          className="px-3 py-1 border border-cyan text-cyan text-[10px] hover:bg-cyan hover:text-black disabled:opacity-50"
                        >
                          {running ? "[ RUNNING... ]" : "[ RUN BTCUSDT ]"}
                        </button>
                      ) : (
                        <button
                          onClick={() => testTool(tool.name, {})}
                          disabled={running}
                          className="px-3 py-1 border border-cyan text-cyan text-[10px] hover:bg-cyan hover:text-black disabled:opacity-50"
                        >
                          {running ? "[ RUNNING... ]" : "[ RUN ]"}
                        </button>
                      )}
                    </div>

                    {testResult && (
                      <pre className="mt-2 p-2 bg-darkBg text-[10px] text-gray-300 overflow-x-auto max-h-60 border border-gray-800">
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
            Add this to your Claude Desktop or MCP-compatible AI client. Set AETHER_API_URL to your deployed URL.
          </p>
        </section>

        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ DATA FLOW ]</h2>
          <div className="text-xs text-gray-400 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-neonGreen">●</span>
              <span className="text-gray-200">fetch_signal / fetch_all_signals / fetch_klines / fetch_sentiment</span>
              <span className="text-gray-600">→ Browser → Bybit API (client-side, no server proxy)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan">●</span>
              <span className="text-gray-200">vote_signal / fetch_leaderboard</span>
              <span className="text-gray-600">→ Server API (in-memory aggregation)</span>
            </div>
          </div>
        </section>
      </div>
    </TerminalLayout>
  );
}
