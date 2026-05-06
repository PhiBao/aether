import { NextResponse } from "next/server";
import { voteStore } from "@/lib/vote-store";

export async function GET() {
  try {
    const results = Object.entries(voteStore)
      .map(([symbol, votes]) => {
        const total = votes.bull + votes.bear;
        return {
          symbol,
          bull: votes.bull,
          bear: votes.bear,
          total,
          bullRatio: total > 0 ? votes.bull / total : 0.5,
        };
      })
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ success: true, leaderboard: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
