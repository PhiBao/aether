import { NextResponse } from "next/server";
import { fetchKlines, fetchFundingRate, POPULAR_PAIRS } from "@/lib/dex/bybit-adapter";
import { fetchSentiment } from "@/lib/dex/elfa-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";

const signalCache: Record<string, { signal: any; timestamp: number }> = {};
const CACHE_TTL = 60000;

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

  if (!klines || klines.length < 20) {
    throw new Error(`Insufficient kline data for ${symbol}: got ${klines?.length || 0} candles`);
  }

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

    const results = await Promise.allSettled(
      POPULAR_PAIRS.map((s) => analyzeSymbol(s))
    );

    const signals: any[] = [];
    const errors: string[] = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        signals.push(r.value);
      } else if (r.status === "rejected") {
        errors.push(`${POPULAR_PAIRS[i]}: ${r.reason?.message || r.reason}`);
      }
    });

    signals.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));

    return NextResponse.json({
      success: true,
      signals,
      ...(errors.length > 0 && { errors }),
    });
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
