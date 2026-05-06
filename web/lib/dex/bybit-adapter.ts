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
  const url = `${BYBIT_BASE}/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);

  const json = await res.json();
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
  const url = `${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=${symbol}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);

  const json = await res.json();
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
