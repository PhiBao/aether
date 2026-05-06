import { Candle, SignalVote, SwarmSignal, ema, rsi, atr, bollingerBands, macd, volumeBreakout, supportResistance } from "./indicators";

const STRATEGIES = [
  "trend_following",
  "mean_reversion",
  "momentum",
  "sr_bounce",
  "volume_breakout",
  "sentiment",
];

function trendFollowing(candles: Candle[]): SignalVote {
  const prices = candles.map((c) => c.close);
  const ema9 = ema(prices, 9);
  const ema21 = ema(prices, 21);
  const ema50 = ema(prices, 50);
  const rsiValues = rsi(prices, 14);
  const atrValues = atr(candles, 14);

  const i = prices.length - 1;
  if (ema9.length <= i || ema21.length <= i || ema50.length <= i) {
    return { strategy: "trend_following", signal: 0, confidence: 0 };
  }

  const alignedLong = ema9[i] > ema21[i] && ema21[i] > ema50[i];
  const alignedShort = ema9[i] < ema21[i] && ema21[i] < ema50[i];
  const freshCross =
    (ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1]) ||
    (ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1]);

  const r = rsiValues[rsiValues.length - 1] ?? 50;
  const validLong = alignedLong && r < 65;
  const validShort = alignedShort && r > 35;

  let signal = 0;
  let confidence = 0;
  let sl: number | undefined;

  if (validLong) {
    signal = freshCross ? 1.0 : 0.7;
    confidence = freshCross ? 0.9 : 0.7;
    sl = candles[i].close - 1.5 * (atrValues[atrValues.length - 1] || 0);
  } else if (validShort) {
    signal = freshCross ? -1.0 : -0.7;
    confidence = freshCross ? 0.9 : 0.7;
    sl = candles[i].close + 1.5 * (atrValues[atrValues.length - 1] || 0);
  }

  return { strategy: "trend_following", signal, confidence, sl };
}

function meanReversion(candles: Candle[]): SignalVote {
  const prices = candles.map((c) => c.close);
  const { upper, middle, lower } = bollingerBands(prices, 20, 2);
  const rsiValues = rsi(prices, 14);
  const i = prices.length - 1;
  const idx = i - 19;
  if (idx < 0) return { strategy: "mean_reversion", signal: 0, confidence: 0 };

  const price = prices[i];
  const r = rsiValues[rsiValues.length - 1] ?? 50;
  const avgVol = candles.slice(i - 20, i).reduce((a, c) => a + c.volume, 0) / 20;
  const volSpike = candles[i].volume > avgVol * 1.5;

  let signal = 0;
  let confidence = 0;
  let sl: number | undefined;

  if (price < lower[idx] && r < 30) {
    signal = volSpike ? 1.0 : 0.8;
    confidence = volSpike ? 0.9 : 0.75;
    sl = lower[idx] - (atr(candles, 14).pop() || 0);
  } else if (price > upper[idx] && r > 70) {
    signal = volSpike ? -1.0 : -0.8;
    confidence = volSpike ? 0.9 : 0.75;
    sl = upper[idx] + (atr(candles, 14).pop() || 0);
  }

  return { strategy: "mean_reversion", signal, confidence, sl };
}

function momentumStrategy(candles: Candle[]): SignalVote {
  const prices = candles.map((c) => c.close);
  const { histogram } = macd(prices, 12, 26, 9);
  const rsiValues = rsi(prices, 14);
  const i = histogram.length - 1;
  if (i < 1) return { strategy: "momentum", signal: 0, confidence: 0 };

  const flipUp = histogram[i] > 0 && histogram[i - 1] <= 0;
  const flipDown = histogram[i] < 0 && histogram[i - 1] >= 0;
  const r = rsiValues[rsiValues.length - 1] ?? 50;
  const avgVol = candles.slice(-21, -1).reduce((a, c) => a + c.volume, 0) / 20;
  const volSpike = candles[candles.length - 1].volume > avgVol * 1.3;

  let signal = 0;
  let confidence = 0;
  let sl: number | undefined;

  if (flipUp && r < 65) {
    signal = volSpike ? 0.9 : 0.6;
    confidence = volSpike ? 0.85 : 0.7;
    sl = candles[candles.length - 1].close - 2 * (atr(candles, 14).pop() || 0);
  } else if (flipDown && r > 35) {
    signal = volSpike ? -0.9 : -0.6;
    confidence = volSpike ? 0.85 : 0.7;
    sl = candles[candles.length - 1].close + 2 * (atr(candles, 14).pop() || 0);
  }

  return { strategy: "momentum", signal, confidence, sl };
}

function srBounce(candles: Candle[]): SignalVote {
  const { supports, resistances } = supportResistance(candles, 20);
  const prices = candles.map((c) => c.close);
  const rsiValues = rsi(prices, 14);
  const price = prices[prices.length - 1];
  const r = rsiValues[rsiValues.length - 1] ?? 50;

  const nearSupport = supports.find((s) => Math.abs(price - s) / price < 0.01);
  const nearResistance = resistances.find((s) => Math.abs(price - s) / price < 0.01);

  let signal = 0;
  let confidence = 0;
  let sl: number | undefined;
  let tp: number | undefined;

  if (nearSupport && r < 40) {
    signal = 0.7;
    confidence = 0.65;
    sl = nearSupport * 0.97;
    tp = resistances.length > 0 ? resistances[resistances.length - 1] : undefined;
  } else if (nearResistance && r > 60) {
    signal = -0.7;
    confidence = 0.65;
    sl = nearResistance * 1.03;
    tp = supports.length > 0 ? supports[supports.length - 1] : undefined;
  }

  return { strategy: "sr_bounce", signal, confidence, sl, tp };
}

function volumeBreakoutStrategy(candles: Candle[]): SignalVote {
  const prices = candles.map((c) => c.close);
  const ema9 = ema(prices, 9);
  const ema21 = ema(prices, 21);
  const i = candles.length - 1;
  const avgVol = candles.slice(i - 20, i).reduce((a, c) => a + c.volume, 0) / 20;
  const volRatio = candles[i].volume / avgVol;
  const priceChange = Math.abs(candles[i].close - candles[i].open) / candles[i].open;

  let signal = 0;
  let confidence = 0;

  if (volRatio > 2 && priceChange > 0.005) {
    const bullish = ema9[ema9.length - 1] > ema21[ema21.length - 1];
    signal = bullish ? Math.min(1.0, volRatio * 0.3) : -Math.min(1.0, volRatio * 0.3);
    confidence = Math.min(1.0, volRatio * 0.15 + 0.5);
  }

  return { strategy: "volume_breakout", signal, confidence };
}

function sentimentVote(sentimentScore: number, sentimentConfidence: number): SignalVote {
  if (sentimentConfidence < 0.2) {
    return { strategy: "sentiment", signal: 0, confidence: 0 };
  }
  const signal = sentimentScore * Math.min(1, sentimentConfidence * 1.5);
  return { strategy: "sentiment", signal, confidence: sentimentConfidence };
}

export function runSwarm(
  candles: Candle[],
  sentimentScore = 0,
  sentimentConfidence = 0,
  fundingBias = 0
): SwarmSignal {
  const votes: SignalVote[] = [
    trendFollowing(candles),
    meanReversion(candles),
    momentumStrategy(candles),
    srBounce(candles),
    volumeBreakoutStrategy(candles),
    sentimentVote(sentimentScore, sentimentConfidence),
  ];

  const activeVotes = votes.filter((v) => v.confidence > 0);
  if (activeVotes.length === 0) {
    return {
      symbol: "",
      direction: "HOLD",
      strength: 0,
      confidence: 0,
      vibeScore: 0,
      sizeMultiplier: 1.0,
      votes,
      timestamp: Date.now(),
    };
  }

  const weightedSignal =
    activeVotes.reduce((sum, v) => sum + v.signal * v.confidence, 0) /
    activeVotes.reduce((sum, v) => sum + v.confidence, 0);

  const agreementCount = activeVotes.filter(
    (v) => (weightedSignal > 0 && v.signal > 0) || (weightedSignal < 0 && v.signal < 0)
  ).length;

  let confidence =
    activeVotes.reduce((sum, v) => sum + v.confidence, 0) / activeVotes.length;
  if (agreementCount >= 3) confidence += 0.15;

  const technicalConsensus = weightedSignal;
  const sentimentWeight = sentimentConfidence > 0.2 ? sentimentScore : 0;
  const vibeScore = technicalConsensus * 0.5 + sentimentWeight * 0.3 + fundingBias * 0.2;

  const fullConsensus =
    (technicalConsensus > 0.2 && sentimentWeight > 0.1 && fundingBias > 0) ||
    (technicalConsensus < -0.2 && sentimentWeight < -0.1 && fundingBias < 0);

  let sizeMultiplier = 1.0;
  const alignment = vibeScore * technicalConsensus;
  if (fullConsensus) sizeMultiplier = 1.5;
  else if (alignment > 0.3) sizeMultiplier = 1.25;
  else if (alignment < 0) sizeMultiplier = 0.75;
  else if (alignment < -0.2) sizeMultiplier = 0.5;

  sizeMultiplier *= 0.5 + confidence * 0.5;

  let direction: "LONG" | "SHORT" | "HOLD" = "HOLD";
  if (weightedSignal >= 0.25) direction = "LONG";
  else if (weightedSignal <= -0.25) direction = "SHORT";

  const consensusFilter =
    agreementCount >= 2 ||
    Math.abs(weightedSignal) >= 0.6 ||
    activeVotes.length === 1;

  if (!consensusFilter) direction = "HOLD";

  return {
    symbol: "",
    direction,
    strength: Math.abs(weightedSignal),
    confidence,
    vibeScore,
    sizeMultiplier,
    votes,
    timestamp: Date.now(),
  };
}
