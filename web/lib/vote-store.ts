// Shared in-memory vote store
// For production, migrate to Redis/Upstash
export const voteStore: Record<string, Record<string, number>> = {
  BTCUSDT: { bull: 47, bear: 23 },
  ETHUSDT: { bull: 38, bear: 31 },
  SOLUSDT: { bull: 52, bear: 18 },
  DOGEUSDT: { bull: 29, bear: 41 },
  XRPUSDT: { bull: 21, bear: 19 },
  TONUSDT: { bull: 15, bear: 12 },
  PEPEUSDT: { bull: 33, bear: 27 },
  WIFUSDT: { bull: 19, bear: 8 },
  BONKUSDT: { bull: 14, bear: 16 },
  FARTCOINUSDT: { bull: 42, bear: 11 },
};
