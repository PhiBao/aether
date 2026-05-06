import { NextResponse } from "next/server";
import { fetchKlines } from "@/lib/dex/bybit-adapter";
import { fetchSentiment } from "@/lib/dex/elfa-adapter";
import { runSwarm } from "@/lib/engine/signals";
import { Candle } from "@/lib/engine/indicators";
import { voteStore } from "@/lib/vote-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol required" }, { status: 400 });
    }

    const klines = await fetchKlines(symbol.toUpperCase(), "60", 100);
    const candles: Candle[] = klines.map((k) => ({
      timestamp: k.timestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));

    const sentiment = await fetchSentiment(symbol);
    const signal = runSwarm(candles, sentiment.score, sentiment.confidence, 0);
    signal.symbol = symbol;

    // Fetch votes
    const key = symbol.toUpperCase();
    const votes = voteStore[key] || { bull: 0, bear: 0 };
    const total = votes.bull + votes.bear;

    return NextResponse.json({
      success: true,
      signal,
      crowd: {
        bull: votes.bull,
        bear: votes.bear,
        total,
        bullRatio: total > 0 ? votes.bull / total : 0.5,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, vote } = body; // vote: "bull" | "bear"

    if (!symbol || !vote || (vote !== "bull" && vote !== "bear")) {
      return NextResponse.json({ success: false, error: "Invalid vote" }, { status: 400 });
    }

    const key = symbol.toUpperCase();
    if (!voteStore[key]) voteStore[key] = { bull: 0, bear: 0 };
    voteStore[key][vote] += 1;

    return NextResponse.json({ success: true, votes: voteStore[key] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
