"use client";

import TerminalLayout from "@/components/TerminalLayout";
import { useAccount, useWriteContract } from "wagmi";
import { AGENT_REGISTRY_ABI, CONTRACTS } from "@/lib/config";
import { mantleSepoliaTestnet } from "wagmi/chains";
import { useState, useEffect } from "react";

const SWARM_AGENTS = [
  { name: "TREND_HUNTER_01", strategy: "TREND_FOLLOWING", streak: 12, accuracy: "72%", pnl: "+34.2%", address: "0x1111...1111", desc: "FOLLOWS EMA CROSSOVERS AND TREND ALIGNMENT" },
  { name: "MEAN_REVERT_02", strategy: "MEAN_REVERSION", streak: 8, accuracy: "65%", pnl: "+21.7%", address: "0x2222...2222", desc: "TRADES BOLLINGER BAND REVERSIONS" },
  { name: "MOMENTUM_BOT_03", strategy: "MOMENTUM", streak: 15, accuracy: "78%", pnl: "+47.3%", address: "0x3333...3333", desc: "RIDES MACD AND RSI MOMENTUM SHIFTS" },
  { name: "SR_BOUNCE_04", strategy: "SR_BOUNCE", streak: 6, accuracy: "58%", pnl: "+18.9%", address: "0x4444...4444", desc: "BOUNCES OFF KEY SUPPORT / RESISTANCE LEVELS" },
  { name: "VOLUME_SNIFFER_05", strategy: "VOLUME_BREAKOUT", streak: 9, accuracy: "69%", pnl: "+29.1%", address: "0x5555...5555", desc: "DETECTS VOLUME SPIKES AND BREAKOUTS" },
  { name: "SENTIMENT_ORACLE_06", strategy: "SENTIMENT", streak: 11, accuracy: "74%", pnl: "+38.5%", address: "0x6666...6666", desc: "READS ELFA SOCIAL SENTIMENT AND FUNDING RATES" },
];

export default function AgentsPage() {
  const { address, isConnected } = useAccount();
  const [metadataURI, setMetadataURI] = useState("ipfs://");
  const [agentAddr, setAgentAddr] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { writeContract } = useWriteContract();
  const registryAddr = CONTRACTS.mantleSepoliaTestnet.AgentRegistry;

  useEffect(() => {
    if (address) setAgentAddr(address);
  }, [address]);

  function register() {
    if (!registryAddr) return alert("Contract not deployed yet");
    if (!agentAddr) return alert("Agent address required");
    setLoading(true);
    writeContract(
      {
        address: registryAddr as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [agentAddr as `0x${string}`, metadataURI],
        chainId: mantleSepoliaTestnet.id,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setLoading(false);
        },
        onError: (err) => {
          alert(err.message);
          setLoading(false);
        },
      }
    );
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* What are agents */}
        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-3">[ THE SWARM ENGINE ]</h2>
          <div className="text-xs text-gray-400 space-y-2">
            <p>
              AETHER RUNS 6 INDEPENDENT STRATEGY AGENTS IN PARALLEL. EACH AGENT ANALYZES THE SAME MARKET DATA
              THROUGH ITS OWN LENS — TREND, MOMENTUM, REVERSION, SUPPORT/RESISTANCE, VOLUME, AND SENTIMENT.
            </p>
            <p>
              THE FINAL SIGNAL IS NOT ONE OPINION. IT IS THE WEIGHTED CONSENSUS OF ALL 6 AGENTS,
              ADJUSTED BY REAL-TIME FUNDING RATES AND ELFA SOCIAL SENTIMENT.
            </p>
          </div>
        </section>

        {/* Swarm Agents */}
        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ ACTIVE AGENTS ]</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SWARM_AGENTS.map((agent) => (
              <div key={agent.name} className="border border-gray-800 p-3 hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-200">{agent.name}</span>
                  <span className="text-[10px] text-neonGreen">{agent.pnl}</span>
                </div>
                <div className="text-[10px] text-gray-500 mb-1">{agent.strategy}</div>
                <div className="text-[10px] text-gray-600 mb-2">{agent.desc}</div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">ACCURACY: {agent.accuracy}</span>
                  <span className="text-gray-600">STREAK: {agent.streak}</span>
                </div>
                <div className="text-[10px] text-gray-700 font-mono mt-1">{agent.address}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mint Agent */}
        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-3">[ REGISTER TRADER IDENTITY ]</h2>
          <p className="text-xs text-gray-500 mb-4">
            MINT AN ON-CHAIN ERC-8004 IDENTITY TO BUILD A VERIFIABLE REPUTATION SCORE.
            SOULBOUND — CANNOT BE SOLD OR TRANSFERRED. YOUR SIGNAL HISTORY IS TIED TO YOUR WALLET FOREVER.
          </p>
          {!isConnected ? (
            <div className="text-gray-500 text-xs border border-gray-800 p-4 text-center">
              CONNECT WALLET IN TOP-RIGHT TO REGISTER
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">WALLET ADDRESS (AUTO-FILLED)</label>
                <input
                  value={agentAddr}
                  onChange={(e) => setAgentAddr(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-darkBg border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-cyan outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">METADATA URI (OPTIONAL)</label>
                <input
                  value={metadataURI}
                  onChange={(e) => setMetadataURI(e.target.value)}
                  placeholder="ipfs://..."
                  className="w-full bg-darkBg border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-cyan outline-none"
                />
              </div>
              <button
                onClick={register}
                disabled={loading || !agentAddr}
                className="w-full py-2 border border-cyan text-cyan hover:bg-cyan hover:text-black transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "MINTING..." : "[ MINT ON MANTLE SEPOLIA ]"}
              </button>
              {txHash && (
                <div className="text-xs text-neonGreen">
                  TX: <a href={`https://sepolia.mantlescan.xyz/tx/${txHash}`} target="_blank" className="underline">{txHash.slice(0, 20)}...</a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Contracts */}
        <section className="border border-gray-800 bg-panelBg p-6">
          <h2 className="text-cyan text-sm font-bold mb-4">[ ON-CHAIN CONTRACTS ]</h2>
          <div className="text-[10px] text-gray-500 font-mono space-y-1">
            <div>AGENT_REGISTRY: {registryAddr}</div>
            <div>SIGNAL_LOGGER: {CONTRACTS.mantleSepoliaTestnet.SignalLogger}</div>
            <div>STRATEGY_VAULT: {CONTRACTS.mantleSepoliaTestnet.StrategyVault}</div>
          </div>
        </section>
      </div>
    </TerminalLayout>
  );
}
