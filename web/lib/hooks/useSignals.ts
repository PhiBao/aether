"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchKlines, fetchFundingRate, POPULAR_PAIRS } from "@/lib/dex/bybit-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";

export type Signal = import("@/lib/engine/indicators").SwarmSignal;

function generateFallbackSentiment(symbol: string) {
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = Math.sin(hash) * 0.5 + 0.5;
  return {
    score: (pseudo - 0.5) * 2,
    confidence: 0.3 + pseudo * 0.4,
    mentionCount: Math.floor(100 + pseudo * 2000),
  };
}

async function analyzeSymbol(symbol: string): Promise<Signal | null> {
  try {
    const [klines, fundingRate] = await Promise.all([
      fetchKlines(symbol, "60", 100),
      fetchFundingRate(symbol),
    ]);

    if (!klines || klines.length < 20) return null;

    const sentiment = generateFallbackSentiment(symbol);

    const candles: Candle[] = klines.map((k) => ({
      timestamp: k.timestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));

    const signal = runSwarm(candles, sentiment.score, sentiment.confidence, fundingRate);
    signal.symbol = symbol;
    signal.timestamp = Date.now();
    signal.meta = {
      sentimentScore: sentiment.score,
      sentimentConfidence: sentiment.confidence,
      fundingRate,
      mentionCount: sentiment.mentionCount,
    };

    return signal;
  } catch (err) {
    console.error(`[useSignals] Failed for ${symbol}:`, err);
    return null;
  }
}

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        POPULAR_PAIRS.map((s) => analyzeSymbol(s))
      );

      const valid: Signal[] = [];
      const errors: string[] = [];

      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          valid.push(r.value);
        } else if (r.status === "rejected") {
          errors.push(`${POPULAR_PAIRS[i]}: ${r.reason?.message || "failed"}`);
        }
      });

      valid.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));

      setSignals(valid);
      if (errors.length > 0) setError(errors.join(", "));
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { signals, loading, error, lastUpdate, refresh: load };
}
