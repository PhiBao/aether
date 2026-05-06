"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Signal {
  symbol: string;
  direction: "LONG" | "SHORT" | "HOLD";
  strength: number;
  confidence: number;
  vibeScore: number;
  sizeMultiplier: number;
  timestamp: number;
  votes: any[];
  meta?: {
    sentimentScore: number;
    sentimentConfidence: number;
    fundingRate: number;
    mentionCount: number;
  };
}

// Mock history for product demo
function generateMockHistory(symbol: string): { date: string; direction: string; result: string; pnl: string }[] {
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const directions = ["LONG", "SHORT", "LONG", "SHORT", "LONG"];
  const results = ["WIN", "WIN", "LOSS", "WIN", "WIN"];
  const pnls = ["+8.2%", "+12.4%", "-4.1%", "+6.7%", "+9.3%"];
  const dates = ["2H AGO", "1D AGO", "2D AGO", "3D AGO", "5D AGO"];

  return directions.map((dir, i) => ({
    date: dates[i],
    direction: dir,
    result: results[(hash + i) % results.length],
    pnl: pnls[(hash + i) % pnls.length],
  }));
}

export default function SignalDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string)?.toUpperCase();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/bot/cycle?symbol=${symbol}`);
        const data = await res.json();
        if (data.success) setSignal(data.signal);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [symbol]);

  function share() {
    if (!signal) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/signal/${signal.symbol}` : "";
    const text = `AETHER SIGNAL\n${signal.symbol} → ${signal.direction}\nConfidence: ${Math.round(signal.confidence * 100)}% | Strength: ${Math.round(signal.strength * 100)}%\n6-Strategy Swarm Consensus\n\n${url}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const history = symbol ? generateMockHistory(symbol) : [];

  if (loading) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-12 text-gray-500 text-xs animate-pulse">
          LOADING SIGNAL...
        </div>
      </TerminalLayout>
    );
  }

  if (!signal) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-12 text-gray-500 text-xs">
          SIGNAL NOT FOUND
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Signal Card */}
        <div className="border-2 border-cyan bg-panelBg p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[10px] text-gray-600">
            MANTLE NETWORK // AETHER
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-100 tracking-wider mb-2">
              {signal.symbol.replace("USDT", "")}
            </h1>
            <div
              className={`inline-block px-4 py-1 text-lg font-bold border-2 ${
                signal.direction === "LONG"
                  ? "border-neonGreen text-neonGreen bg-neonGreen/10"
                  : signal.direction === "SHORT"
                  ? "border-neonRed text-neonRed bg-neonRed/10"
                  : "border-gray-600 text-gray-500"
              }`}
            >
              {signal.direction}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center border border-gray-800 p-3">
              <div className="text-[10px] text-gray-500 mb-1">CONFIDENCE</div>
              <div className="text-cyan font-bold text-xl">{Math.round(signal.confidence * 100)}%</div>
            </div>
            <div className="text-center border border-gray-800 p-3">
              <div className="text-[10px] text-gray-500 mb-1">STRENGTH</div>
              <div className="text-cyan font-bold text-xl">{Math.round(signal.strength * 100)}%</div>
            </div>
            <div className="text-center border border-gray-800 p-3">
              <div className="text-[10px] text-gray-500 mb-1">VIBE</div>
              <div className={`font-bold text-xl ${signal.vibeScore > 0 ? "text-neonGreen" : signal.vibeScore < 0 ? "text-neonRed" : "text-gray-500"}`}>
                {signal.vibeScore > 0 ? "🐂" : signal.vibeScore < 0 ? "🐻" : "➖"} {Math.abs(Math.round(signal.vibeScore * 100))}%
              </div>
            </div>
          </div>

          <div className="border border-gray-800 p-4 mb-6">
            <div className="text-[10px] text-gray-500 mb-3">STRATEGY BREAKDOWN</div>
            <div className="space-y-2">
              {signal.votes?.map((vote: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 uppercase">{vote.strategy.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full ${vote.signal > 0 ? "bg-neonGreen" : vote.signal < 0 ? "bg-neonRed" : "bg-gray-600"}`}
                        style={{ width: `${Math.abs(vote.signal) * 100}%` }}
                      />
                    </div>
                    <span className={`w-8 text-right ${vote.signal > 0 ? "text-neonGreen" : vote.signal < 0 ? "text-neonRed" : "text-gray-500"}`}>
                      {vote.signal > 0 ? "BUY" : vote.signal < 0 ? "SELL" : "HOLD"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 text-[10px] text-gray-600 justify-center mb-6">
            <span>ELFA: {signal.meta?.sentimentScore && signal.meta.sentimentScore > 0 ? "🐂" : "🐻"} {Math.abs(Math.round((signal.meta?.sentimentScore || 0) * 100))}%</span>
            <span>MENTIONS: {signal.meta?.mentionCount?.toLocaleString() || 0}</span>
            <span>FUNDING: {(signal.meta?.fundingRate || 0).toExponential(2)}</span>
          </div>

          <button
            onClick={share}
            className="w-full py-3 border-2 border-cyan text-cyan hover:bg-cyan hover:text-black transition-colors text-sm font-bold"
          >
            {copied ? "[ COPIED! ]" : "[ COPY FOR X/TWITTER ]"}
          </button>
        </div>

        {/* Recent History */}
        <div className="border border-gray-800 bg-panelBg p-6">
          <h3 className="text-cyan text-sm font-bold mb-4">[ RECENT SIGNAL HISTORY ]</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs border-b border-gray-800 pb-2 last:border-0">
                <span className="text-gray-500 w-16">{h.date}</span>
                <span
                  className={`font-bold ${
                    h.direction === "LONG" ? "text-neonGreen" : "text-neonRed"
                  }`}
                >
                  {h.direction}
                </span>
                <span
                  className={`${h.result === "WIN" ? "text-neonGreen" : "text-neonRed"}`}
                >
                  {h.result}
                </span>
                <span className="text-gray-400">{h.pnl}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-3">
            HISTORICAL PERFORMANCE IS SIMULATED FOR DEMONSTRATION. PAST SIGNALS DO NOT GUARANTEE FUTURE RESULTS.
          </p>
        </div>

        <div className="text-center text-[10px] text-gray-600">
          AETHER IS A SIGNAL INTELLIGENCE TERMINAL — NOT FINANCIAL ADVICE
        </div>
      </div>
    </TerminalLayout>
  );
}
