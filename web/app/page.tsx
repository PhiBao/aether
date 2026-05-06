"use client";

import TerminalLayout from "@/components/TerminalLayout";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface Signal {
  symbol: string;
  direction: "LONG" | "SHORT" | "HOLD";
  strength: number;
  confidence: number;
  vibeScore: number;
  sizeMultiplier: number;
  timestamp: number;
  meta?: {
    sentimentScore: number;
    sentimentConfidence: number;
    fundingRate: number;
    mentionCount: number;
  };
}

function getDisagreement(signal: Signal, crowdBullRatio: number): "AGREE" | "DISAGREE" | "STRONG_DISAGREE" {
  const aiBull = signal.direction === "LONG";
  const aiBear = signal.direction === "SHORT";
  if (!aiBull && !aiBear) return "AGREE";
  const crowdBearRatio = 1 - crowdBullRatio;
  if (aiBull && crowdBearRatio > 0.6) return "STRONG_DISAGREE";
  if (aiBear && crowdBullRatio > 0.6) return "STRONG_DISAGREE";
  if (aiBull && crowdBearRatio > 0.5) return "DISAGREE";
  if (aiBear && crowdBullRatio > 0.5) return "DISAGREE";
  return "AGREE";
}

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [votes, setVotes] = useState<Record<string, { bull: number; bear: number; total: number; bullRatio: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [elfaActive, setElfaActive] = useState<boolean | null>(null);

  // Load user votes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aether_user_votes");
      if (saved) setUserVotes(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save user votes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("aether_user_votes", JSON.stringify(userVotes));
    } catch { /* ignore */ }
  }, [userVotes]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bot/cycle");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSignals(data.signals || []);

      const voteData: Record<string, any> = {};
      await Promise.all(
        (data.signals || []).map(async (s: Signal) => {
          const vr = await fetch(`/api/votes?symbol=${s.symbol}`);
          const vd = await vr.json();
          if (vd.success) voteData[s.symbol] = vd.votes;
        })
      );
      setVotes(voteData);
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setElfaActive(d.features?.elfa ?? false))
      .catch(() => setElfaActive(false));
    return () => clearInterval(interval);
  }, [loadData]);

  async function vote(symbol: string, side: "bull" | "bear") {
    if (userVotes[symbol]) return;
    try {
      await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, vote: side }),
      });
      setUserVotes((prev) => ({ ...prev, [symbol]: side }));
      const vr = await fetch(`/api/votes?symbol=${symbol}`);
      const vd = await vr.json();
      if (vd.success) {
        setVotes((prev) => ({ ...prev, [symbol]: vd.votes }));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function shareSignal(signal: Signal) {
    const url = typeof window !== "undefined" ? `${window.location.origin}/signal/${signal.symbol}` : `/signal/${signal.symbol}`;
    const text = `AETHER SIGNAL\n${signal.symbol} → ${signal.direction}\nConfidence: ${Math.round(signal.confidence * 100)}% | Strength: ${Math.round(signal.strength * 100)}%\n6-Strategy Swarm Consensus\n\n${url}`;
    navigator.clipboard.writeText(text);
    setCopiedSymbol(signal.symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  }

  return (
    <TerminalLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-cyan text-lg font-bold tracking-wider">[ AI SWARM SIGNAL FEED ]</h1>
            <p className="text-[10px] text-gray-500 mt-1">
              BYBIT MARKET DATA + ELFA SOCIAL SENTIMENT + 6-STRATEGY CONSENSUS
              {elfaActive === true && <span className="text-neonGreen ml-2">● ELFA LIVE</span>}
              {elfaActive === false && <span className="text-gray-600 ml-2">● ELFA MOCK</span>}
            </p>
          </div>
          <div className="text-right">
            {lastUpdate && (
              <div className="text-[10px] text-gray-600">LAST UPDATE {lastUpdate.toLocaleTimeString()}</div>
            )}
            <button
              onClick={loadData}
              className="mt-1 border border-gray-700 text-gray-500 px-3 py-1 text-[10px] hover:border-cyan hover:text-cyan transition-colors"
            >
              [ REFRESH ]
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 border border-neonRed bg-panelBg p-3 text-xs text-neonRed">
            ⚠️ {error}
          </div>
        )}

        {/* Signal Feed */}
        <div className="space-y-3">
          {loading && signals.length === 0 ? (
            <div className="text-gray-500 text-xs animate-pulse py-8 text-center">LOADING SIGNALS...</div>
          ) : (
            signals.map((sig, i) => {
              const voteData = votes[sig.symbol];
              const hasVoted = userVotes[sig.symbol];
              const bullRatio = voteData?.bullRatio ?? 0.5;
              const disagreement = voteData?.total > 0 ? getDisagreement(sig, bullRatio) : "AGREE";

              return (
                <div
                  key={sig.symbol}
                  className="border border-gray-800 bg-panelBg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-[10px]">#{i + 1}</span>
                      <span className="text-gray-200 font-bold text-sm">{sig.symbol.replace("USDT", "")}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold border ${
                          sig.direction === "LONG"
                            ? "border-neonGreen text-neonGreen bg-neonGreen/10"
                            : sig.direction === "SHORT"
                            ? "border-neonRed text-neonRed bg-neonRed/10"
                            : "border-gray-600 text-gray-500"
                        }`}
                      >
                        {sig.direction}
                      </span>
                      {disagreement === "STRONG_DISAGREE" && (
                        <span className="text-[10px] text-neonRed border border-neonRed px-1.5 py-0.5">
                          CROWD DISAGREES
                        </span>
                      )}
                      {disagreement === "DISAGREE" && (
                        <span className="text-[10px] text-yellow-500 border border-yellow-600 px-1.5 py-0.5">
                          SPLIT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500">STR {Math.round(sig.strength * 100)}%</span>
                      <span className="text-[10px] text-gray-500">CONF {Math.round(sig.confidence * 100)}%</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-2 flex gap-4 text-[10px] text-gray-600">
                    <span>SENTIMENT: {sig.meta?.sentimentScore && sig.meta.sentimentScore > 0 ? "🐂" : "🐻"} {Math.abs(Math.round((sig.meta?.sentimentScore || 0) * 100))}%</span>
                    <span>MENTIONS: {sig.meta?.mentionCount?.toLocaleString() || 0}</span>
                    <span>FUNDING: {(sig.meta?.fundingRate || 0).toExponential(2)}</span>
                  </div>

                  {/* Voting */}
                  <div className="mt-3 flex items-center gap-3">
                    {!hasVoted ? (
                      <>
                        <button
                          onClick={() => vote(sig.symbol, "bull")}
                          className="border border-neonGreen text-neonGreen px-3 py-1 text-[10px] hover:bg-neonGreen hover:text-black transition-colors"
                        >
                          🐂 BULL
                        </button>
                        <button
                          onClick={() => vote(sig.symbol, "bear")}
                          className="border border-neonRed text-neonRed px-3 py-1 text-[10px] hover:bg-neonRed hover:text-white transition-colors"
                        >
                          🐻 BEAR
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">YOU VOTED {hasVoted.toUpperCase()} ✓</span>
                    )}

                    {voteData && voteData.total > 0 && (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neonGreen"
                            style={{ width: `${voteData.bullRatio * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{voteData.bull}/{voteData.bear}</span>
                      </div>
                    )}

                    <Link
                      href={`/signal/${sig.symbol}`}
                      className="border border-gray-700 text-gray-500 px-2 py-1 text-[10px] hover:border-cyan hover:text-cyan transition-colors"
                    >
                      [ VIEW ]
                    </Link>
                    <button
                      onClick={() => shareSignal(sig)}
                      className={`border px-2 py-1 text-[10px] transition-colors ${
                        copiedSymbol === sig.symbol
                          ? "border-neonGreen text-neonGreen bg-neonGreen/10"
                          : "border-cyan text-cyan hover:bg-cyan hover:text-black"
                      }`}
                    >
                      {copiedSymbol === sig.symbol ? "[ COPIED! ]" : "[ SHARE ]"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}
