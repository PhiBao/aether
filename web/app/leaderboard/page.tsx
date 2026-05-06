"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchKlines, fetchFundingRate, POPULAR_PAIRS } from "@/lib/dex/bybit-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";

interface LeaderboardEntry {
  symbol: string;
  bull: number;
  bear: number;
  total: number;
  bullRatio: number;
  direction?: string;
  strength?: number;
}

function generateFallbackSentiment(symbol: string) {
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = Math.sin(hash) * 0.5 + 0.5;
  return { score: (pseudo - 0.5) * 2, confidence: 0.3 + pseudo * 0.4 };
}

function getCrowdDirection(ratio: number): "BULL" | "BEAR" | "NEUTRAL" {
  if (ratio > 0.55) return "BULL";
  if (ratio < 0.45) return "BEAR";
  return "NEUTRAL";
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const lbRes = await fetch("/api/leaderboard");
      const lbJson = await lbRes.json();
      const leaderboard: LeaderboardEntry[] = lbJson.leaderboard || [];

      const signalResults = await Promise.allSettled(
        leaderboard.map(async (entry) => {
          try {
            const [klines, fundingRate] = await Promise.all([
              fetchKlines(entry.symbol, "60", 50),
              fetchFundingRate(entry.symbol),
            ]);
            if (!klines || klines.length < 10) return { ...entry, direction: "HOLD", strength: 0 };
            const sentiment = generateFallbackSentiment(entry.symbol);
            const candles: Candle[] = klines.map((k) => ({
              timestamp: k.timestamp, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume,
            }));
            const sig = runSwarm(candles, sentiment.score, sentiment.confidence, fundingRate);
            return { ...entry, direction: sig.direction, strength: sig.strength };
          } catch {
            return { ...entry, direction: "HOLD", strength: 0 };
          }
        })
      );

      const merged = signalResults.map((r, i) =>
        r.status === "fulfilled" ? r.value : leaderboard[i]
      );

      merged.sort((a, b) => {
        const aiA = a.direction || "HOLD";
        const aiB = b.direction || "HOLD";
        const crowdA = getCrowdDirection(a.bullRatio);
        const crowdB = getCrowdDirection(b.bullRatio);
        const disagreeA = (aiA === "LONG" && crowdA === "BEAR") || (aiA === "SHORT" && crowdA === "BULL");
        const disagreeB = (aiB === "LONG" && crowdB === "BEAR") || (aiB === "SHORT" && crowdB === "BULL");
        if (disagreeA && !disagreeB) return -1;
        if (disagreeB && !disagreeA) return 1;
        return b.total - a.total;
      });

      setEntries(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-cyan text-lg font-bold tracking-wider mb-1">[ MARKET SENTIMENT MAP ]</h1>
          <p className="text-[10px] text-gray-500">
            WHERE THE CROWD DISAGREES WITH THE AI — POTENTIAL CONTRARIAN OPPORTUNITIES
          </p>
        </div>

        {loading && entries.length === 0 ? (
          <div className="text-gray-500 text-xs animate-pulse py-8 text-center">LOADING...</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-500 text-xs py-8 text-center">NO DATA YET</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-600 px-3 pb-2 border-b border-gray-800">
              <div className="col-span-2">SYMBOL</div>
              <div className="col-span-2 text-center">AI SIGNAL</div>
              <div className="col-span-2 text-center">CROWD</div>
              <div className="col-span-3">ALIGNMENT</div>
              <div className="col-span-2 text-right">VOTES</div>
              <div className="col-span-1"></div>
            </div>

            {entries.map((entry) => {
              const aiDir = entry.direction || "HOLD";
              const crowdDir = getCrowdDirection(entry.bullRatio);
              const disagree = (aiDir === "LONG" && crowdDir === "BEAR") || (aiDir === "SHORT" && crowdDir === "BULL");
              const strength = entry.strength ? Math.round(entry.strength * 100) : 0;

              return (
                <div
                  key={entry.symbol}
                  className="grid grid-cols-12 gap-2 items-center border border-gray-800 bg-panelBg p-3 hover:border-gray-600 transition-colors"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-gray-200 font-bold">{entry.symbol.replace("USDT", "")}</span>
                    <span className="text-[10px] text-gray-600">STR {strength}%</span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 border ${
                        aiDir === "LONG"
                          ? "border-neonGreen text-neonGreen"
                          : aiDir === "SHORT"
                          ? "border-neonRed text-neonRed"
                          : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {aiDir}
                    </span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span
                      className={`text-[10px] font-bold ${
                        crowdDir === "BULL"
                          ? "text-neonGreen"
                          : crowdDir === "BEAR"
                          ? "text-neonRed"
                          : "text-gray-500"
                      }`}
                    >
                      {crowdDir}
                    </span>
                  </div>

                  <div className="col-span-3">
                    {disagree ? (
                      <span className="text-[10px] text-neonRed border border-neonRed px-1.5 py-0.5">
                        ⚠ DISAGREEMENT
                      </span>
                    ) : (
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[100px]">
                        <div className="h-full bg-neonGreen" style={{ width: `${entry.bullRatio * 100}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-right text-xs">
                    <span className="text-neonGreen">{entry.bull}</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-neonRed">{entry.bear}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    <Link href={`/signal/${entry.symbol}`} className="text-[10px] text-gray-500 hover:text-cyan transition-colors">
                      VIEW →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
