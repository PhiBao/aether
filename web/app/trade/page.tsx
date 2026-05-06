"use client";

import TerminalLayout from "@/components/TerminalLayout";

export default function TradePage() {
  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-cyan text-sm font-bold mb-4">[ EXECUTE ON YOUR EXCHANGE ]</h2>
        <p className="text-xs text-gray-400 mb-6">
          AETHER IS A SIGNAL INTELLIGENCE TERMINAL, NOT A BROKER.
          <br />
          USE SIGNALS AS RESEARCH AND EXECUTE TRADES ON BYBIT, BINANCE, OR DEX OF YOUR CHOICE.
        </p>
        <div className="text-[10px] text-gray-600">
          DIRECT DEX INTEGRATION VIA MANTLE NETWORK IS ON THE ROADMAP
        </div>
      </div>
    </TerminalLayout>
  );
}
