"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV = [
  { label: "SIGNALS", href: "/" },
  { label: "LEADERBOARD", href: "/leaderboard" },
  { label: "AGENTS", href: "/agents" },
  { label: "MCP", href: "/docs/mcp" },
];

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-panelBg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-cyan font-bold text-lg tracking-wider">
            [ AETHER::MANTLE ]
          </Link>
          <nav className="hidden md:flex gap-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-xs text-gray-400 hover:text-cyan transition-colors uppercase"
              >
                [ {n.label} ]
              </Link>
            ))}
          </nav>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-1 p-4 md:p-6">{children}</main>

      <footer className="border-t border-gray-800 bg-panelBg px-4 py-2 text-[10px] text-gray-500 flex justify-between">
        <span>AI SIGNAL INTELLIGENCE TERMINAL</span>
        <span>MANTLE NETWORK // BYBIT DATA // ELFA SENTIMENT</span>
      </footer>
    </div>
  );
}
