"use client";

import TerminalLayout from "@/components/TerminalLayout";

export default function PositionsPage() {
  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-cyan text-sm font-bold mb-4">[ PORTFOLIO TRACKING ]</h2>
        <p className="text-xs text-gray-400 mb-6">
          TRACK YOUR POSITIONS ACROSS EXCHANGES IN ONE DASHBOARD.
          <br />
          CONNECT YOUR EXCHANGE API OR WALLET TO SEE REAL-TIME PNL.
        </p>
        <div className="text-[10px] text-gray-600">
          INTEGRATION WITH MANTLE DEX AND CEX APIs IS ON THE ROADMAP
        </div>
      </div>
    </TerminalLayout>
  );
}
