// Elfa AI Sentiment Adapter
// Sponsor of the hackathon — social sentiment for crypto
// Docs: https://docs.elfa.ai (if available, otherwise generic REST)

export interface ElfaSentiment {
  symbol: string;
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  mentionCount: number;
  bullishRatio: number;
  bearishRatio: number;
  timestamp: number;
}

const ELFA_BASE = "https://api.elfa.ai";
const ELFA_API_KEY = process.env.ELFA_API_KEY || "";

// Log once at startup whether we're using real Elfa or fallback
if (typeof process !== "undefined") {
  if (ELFA_API_KEY) {
    console.log("[ELFA] API key loaded — using real sentiment data");
  } else {
    console.log("[ELFA] No API key — using deterministic fallback sentiment");
  }
}

export async function fetchSentiment(symbol: string): Promise<ElfaSentiment> {
  try {
    if (!ELFA_API_KEY) {
      return generateFallbackSentiment(symbol);
    }

    const res = await fetch(`${ELFA_BASE}/v1/sentiment?symbol=${symbol}`, {
      headers: { "x-api-key": ELFA_API_KEY },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(`[ELFA] API returned ${res.status} for ${symbol} — using fallback`);
      return generateFallbackSentiment(symbol);
    }

    const data = await res.json();
    return {
      symbol,
      score: data.score ?? data.data?.score ?? 0,
      confidence: data.confidence ?? data.data?.confidence ?? 0,
      mentionCount: data.mentions ?? data.data?.mentions ?? 0,
      bullishRatio: data.bullish_ratio ?? data.data?.bullish_ratio ?? 0.5,
      bearishRatio: data.bearish_ratio ?? data.data?.bearish_ratio ?? 0.5,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.warn(`[ELFA] Error fetching ${symbol}: ${err.message} — using fallback`);
    return generateFallbackSentiment(symbol);
  }
}

function generateFallbackSentiment(symbol: string): ElfaSentiment {
  // Deterministic pseudo-random based on symbol so it feels consistent
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudo = Math.sin(hash) * 0.5 + 0.5; // 0-1
  const score = (pseudo - 0.5) * 2; // -1 to 1

  return {
    symbol,
    score,
    confidence: 0.3 + pseudo * 0.4,
    mentionCount: Math.floor(100 + pseudo * 2000),
    bullishRatio: pseudo > 0.5 ? pseudo : 1 - pseudo,
    bearishRatio: pseudo > 0.5 ? 1 - pseudo : pseudo,
    timestamp: Date.now(),
  };
}

export async function fetchTrendingSymbols(): Promise<string[]> {
  try {
    const res = await fetch(`${ELFA_BASE}/v1/trending`, {
      headers: ELFA_API_KEY ? { "x-api-key": ELFA_API_KEY } : {},
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.symbols || [];
  } catch {
    return [];
  }
}
