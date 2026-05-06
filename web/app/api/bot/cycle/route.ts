import { NextResponse } from "next/server";
import { fetchKlines, fetchFundingRate, POPULAR_PAIRS } from "@/lib/dex/bybit-adapter";
import { fetchSentiment } from "@/lib/dex/elfa-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";

// In-memory cache for signals (public terminal — no auth needed)
const signalCache: Record<string, { signal: any; timestamp: number }> = {};
const CACHE_TTL = 60000; // 1 minute

async function analyzeSymbol(symbol: string) {
  const cached = signalCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.signal;
  }

  const [klines, fundingRate, sentiment] = await Promise.all([
    fetchKlines(symbol, "60", 100),
    fetchFundingRate(symbol),
    fetchSentiment(symbol),
  ]);

  const candles: Candle[] = klines.map((k) => ({
    timestamp: k.timestamp,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));

  const signal = runSwarm(
    candles,
    sentiment.score,
    sentiment.confidence,
    fundingRate
  );
  signal.symbol = symbol;
  signal.timestamp = Date.now();
  signal.meta = {
    sentimentScore: sentiment.score,
    sentimentConfidence: sentiment.confidence,
    fundingRate,
    mentionCount: sentiment.mentionCount,
  };

  signalCache[symbol] = { signal, timestamp: Date.now() };
  return signal;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (symbol) {
      const signal = await analyzeSymbol(symbol.toUpperCase());
      return NextResponse.json({ success: true, signal });
    }

    // Batch analyze all popular pairs
    const signals = await Promise.all(
      POPULAR_PAIRS.map((s) => analyzeSymbol(s).catch(() => null))
    );

    const valid = signals.filter(Boolean);
    // Sort by absolute strength
    valid.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));

    return NextResponse.json({ success: true, signals: valid });
  } catch (err: any) {
    console.error("[API /bot/cycle]", err);
    return NextResponse.json(
      { success: false, error: err.message, signals: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol } = body;
    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol required" }, { status: 400 });
    }
    const signal = await analyzeSymbol(symbol.toUpperCase());
    return NextResponse.json({ success: true, signal });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
