"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Signal {
  symbol: string;
  direction: "LONG" | "SHORT" | "HOLD";
  strength: number;
  confidence: number;
}

interface LeaderboardEntry {
  symbol: string;
  bull: number;
  bear: number;
  total: number;
  bullRatio: number;
}

function getCrowdDirection(ratio: number): "BULL" | "BEAR" | "NEUTRAL" {
  if (ratio > 0.55) return "BULL";
  if (ratio < 0.45) return "BEAR";
  return "NEUTRAL";
}

function getDisagreement(ai: string, crowd: string): "AGREE" | "DISAGREE" | "STRONG_DISAGREE" {
  if (ai === "HOLD" || crowd === "NEUTRAL") return "AGREE";
  if (ai === crowd) return "AGREE";
  return "DISAGREE";
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<(LeaderboardEntry & { signal?: Signal })[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [lbRes, sigRes] = await Promise.all([
        fetch("/api/leaderboard"),
        fetch("/api/bot/cycle"),
      ]);
      const lbJson = await lbRes.json();
      const sigJson = await sigRes.json();

      const signals: Signal[] = sigJson.signals || [];
      const leaderboard: LeaderboardEntry[] = lbJson.leaderboard || [];

      // Merge signals into leaderboard entries
      const merged = leaderboard.map((entry) => ({
        ...entry,
        signal: signals.find((s) => s.symbol === entry.symbol),
      }));

      // Sort by most interesting: strong disagreement first, then by total votes
      merged.sort((a, b) => {
        const da = getDisagreement(a.signal?.direction || "HOLD", getCrowdDirection(a.bullRatio));
        const db = getDisagreement(b.signal?.direction || "HOLD", getCrowdDirection(b.bullRatio));
        if (da === "DISAGREE" && db !== "DISAGREE") return -1;
        if (db === "DISAGREE" && da !== "DISAGREE") return 1;
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
    const interval = setInterval(load, 15000);
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
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-600 px-3 pb-2 border-b border-gray-800">
              <div className="col-span-2">SYMBOL</div>
              <div className="col-span-2 text-center">AI SIGNAL</div>
              <div className="col-span-2 text-center">CROWD</div>
              <div className="col-span-3">ALIGNMENT</div>
              <div className="col-span-2 text-right">VOTES</div>
              <div className="col-span-1"></div>
            </div>

            {entries.map((entry) => {
              const aiDir = entry.signal?.direction || "HOLD";
              const crowdDir = getCrowdDirection(entry.bullRatio);
              const disagreement = getDisagreement(aiDir, crowdDir);
              const strength = entry.signal ? Math.round(entry.signal.strength * 100) : 0;

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
                    {disagreement === "DISAGREE" ? (
                      <span className="text-[10px] text-neonRed border border-neonRed px-1.5 py-0.5">
                        ⚠ DISAGREEMENT
                      </span>
                    ) : (
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-neonGreen"
                          style={{ width: `${entry.bullRatio * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-right text-xs">
                    <span className="text-neonGreen">{entry.bull}</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-neonRed">{entry.bear}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    <Link
                      href={`/signal/${entry.symbol}`}
                      className="text-[10px] text-gray-500 hover:text-cyan transition-colors"
                    >
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
