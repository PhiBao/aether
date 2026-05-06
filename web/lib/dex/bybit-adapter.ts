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

export async function fetchKlines(
  symbol: string,
  interval: string = "60",
  limit: number = 200
): Promise<BybitCandle[]> {
  const url = new URL("/v5/market/kline", BYBIT_BASE);
  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);

  const json = await res.json();
  if (json.retCode !== 0) throw new Error(`Bybit error: ${json.retMsg}`);

  // Bybit returns: [timestamp, open, high, low, close, volume, turnover]
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

export async function fetchTickers(): Promise<any[]> {
  const url = new URL("/v5/market/tickers", BYBIT_BASE);
  url.searchParams.set("category", "linear");

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);

  const json = await res.json();
  if (json.retCode !== 0) throw new Error(`Bybit error: ${json.retMsg}`);

  return json.result?.list || [];
}

export async function fetchFundingRate(symbol: string): Promise<number> {
  const url = new URL("/v5/market/tickers", BYBIT_BASE);
  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  const json = await res.json();
  const ticker = json.result?.list?.[0];
  return parseFloat(ticker?.fundingRate || "0");
}

// Popular perpetual pairs for the feed
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
