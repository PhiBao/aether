import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, message: "DEX integration coming soon", status: "placeholder" });
}
