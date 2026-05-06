export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalVote {
  strategy: string;
  signal: number; // -1 to 1
  confidence: number; // 0 to 1
  sl?: number;
  tp?: number;
}

export interface SwarmSignal {
  symbol: string;
  direction: "LONG" | "SHORT" | "HOLD";
  strength: number; // 0 to 1
  confidence: number;
  vibeScore: number; // -1 to 1
  sizeMultiplier: number;
  votes: SignalVote[];
  timestamp: number;
  meta?: Record<string, any>;
}

// Simple technical indicators for swarm engine
export function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaValues: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emaValues.push(prices[i] * k + emaValues[i - 1] * (1 - k));
  }
  return emaValues;
}

export function rsi(prices: number[], period = 14): number[] {
  const rsiValues: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsiValues;
}

export function atr(candles: Candle[], period = 14): number[] {
  const atrValues: number[] = [];
  let trSum = 0;

  for (let i = 1; i <= period && i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trSum += tr;
    atrValues.push(trSum / i);
  }

  let atrVal = trSum / period;
  atrValues.push(atrVal);

  for (let i = period + 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    atrVal = (atrVal * (period - 1) + tr) / period;
    atrValues.push(atrVal);
  }

  return atrValues;
}

export function bollingerBands(prices: number[], period = 20, multiplier = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    middle.push(mean);
    upper.push(mean + multiplier * std);
    lower.push(mean - multiplier * std);
  }

  return { upper, middle, lower };
}

export function macd(prices: number[], fast = 12, slow = 26, signal = 9): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine = emaFast.slice(-emaSlow.length).map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.slice(-signalLine.length).map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export function volumeBreakout(candles: Candle[], period = 20, threshold = 2): boolean[] {
  const result: boolean[] = [];
  for (let i = period; i < candles.length; i++) {
    const avgVol = candles.slice(i - period, i).reduce((a, b) => a + b.volume, 0) / period;
    result.push(candles[i].volume > avgVol * threshold);
  }
  return result;
}

export function supportResistance(candles: Candle[], lookback = 20): { supports: number[]; resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const isSupport = window.every((c) => c.low >= candles[i].low);
    const isResistance = window.every((c) => c.high <= candles[i].high);

    if (isSupport) supports.push(candles[i].low);
    if (isResistance) resistances.push(candles[i].high);
  }

  return { supports, resistances };
}
