import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "online",
    features: {
      signals: true,
      voting: true,
      leaderboard: true,
      bybit: true,
      elfa: !!process.env.ELFA_API_KEY,
      elfaKeyLoaded: !!process.env.ELFA_API_KEY,
      mantle: true,
    },
  });
}
