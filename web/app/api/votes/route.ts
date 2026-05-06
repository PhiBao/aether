import { NextResponse } from "next/server";
import { voteStore } from "@/lib/vote-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol required" }, { status: 400 });
    }

    const key = symbol.toUpperCase();
    const votes = voteStore[key] || { bull: 0, bear: 0 };
    const total = votes.bull + votes.bear;

    return NextResponse.json({
      success: true,
      votes: {
        ...votes,
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
    const { symbol, vote } = body;

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
