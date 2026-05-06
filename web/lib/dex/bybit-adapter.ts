// Bybit Market Data Adapter
// Public V5 API — no auth required for klines

export interface BybitCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

const BYBIT_BASE = "https://api.bybit.com";

const HEADERS = {
  "User-Agent": "AETHER/1.0 (https://aether-swarm-blush.vercel.app)",
  "Accept": "application/json",
};

async function bybitFetch(path: string, params: Record<string, string>) {
  const url = new URL(path, BYBIT_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Bybit API error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Bybit returned non-JSON: ${text.slice(0, 100)}`);
  }
}

export async function fetchKlines(
  symbol: string,
  interval: string = "60",
  limit: number = 200
): Promise<BybitCandle[]> {
  const json = await bybitFetch("/v5/market/kline", {
    category: "linear",
    symbol,
    interval,
    limit: String(limit),
  });

  if (json.retCode !== 0) throw new Error(`Bybit error: ${json.retMsg}`);

  return (json.result?.list || []).map((c: string[]) => ({
    timestamp: parseInt(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
    turnover: parseFloat(c[6]),
  }));
}

export async function fetchFundingRate(symbol: string): Promise<number> {
  const json = await bybitFetch("/v5/market/tickers", {
    category: "linear",
    symbol,
  });

  if (json.retCode !== 0) throw new Error(`Bybit error: ${json.retMsg}`);

  const ticker = json.result?.list?.[0];
  return parseFloat(ticker?.fundingRate || "0");
}

export const POPULAR_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "DOGEUSDT",
  "XRPUSDT",
  "TONUSDT",
  "PEPEUSDT",
  "WIFUSDT",
  "BONKUSDT",
  "FARTCOINUSDT",
];
