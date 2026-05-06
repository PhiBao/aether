// Seed script to populate AgentRegistry with demo agents
// Run: DEPLOYER_PK=0x... npx tsx scripts/seed-agents.ts

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantleSepoliaTestnet } from "viem/chains";

const RPC = "https://rpc.sepolia.mantle.xyz";
const REGISTRY = "0x6792E51FBD24f9315282BD5b6c5E713dCc779C69" as `0x${string}`;

const AGENT_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "agentToTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_agentWallet", type: "address" },
      { internalType: "string", name: "_metadataURI", type: "string" },
    ],
    name: "registerAgent",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const DEMO_AGENTS = [
  { name: "TREND_HUNTER_01", address: "0x1111111111111111111111111111111111111111" as `0x${string}`, uri: "ipfs://QmTrendHunter" },
  { name: "MEAN_REVERT_02", address: "0x2222222222222222222222222222222222222222" as `0x${string}`, uri: "ipfs://QmMeanRevert" },
  { name: "MOMENTUM_BOT_03", address: "0x3333333333333333333333333333333333333333" as `0x${string}`, uri: "ipfs://QmMomentumBot" },
  { name: "SR_BOUNCE_04", address: "0x4444444444444444444444444444444444444444" as `0x${string}`, uri: "ipfs://QmSRBounce" },
  { name: "VOLUME_SNIFFER_05", address: "0x5555555555555555555555555555555555555555" as `0x${string}`, uri: "ipfs://QmVolumeSniffer" },
  { name: "SENTIMENT_ORACLE_06", address: "0x6666666666666666666666666666666666666666" as `0x${string}`, uri: "ipfs://QmSentimentOracle" },
];

async function main() {
  const pk = process.env.DEPLOYER_PK;
  if (!pk) {
    console.error("Set DEPLOYER_PK env var");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: mantleSepoliaTestnet, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: mantleSepoliaTestnet, transport: http(RPC) });

  console.log(`Seeding ${DEMO_AGENTS.length} demo agents from ${account.address}...\n`);

  for (const agent of DEMO_AGENTS) {
    try {
      // Check if already registered
      const tokenId = await publicClient.readContract({
        address: REGISTRY,
        abi: AGENT_REGISTRY_ABI,
        functionName: "agentToTokenId",
        args: [agent.address],
      });

      if (tokenId !== BigInt(0)) {
        console.log(`⚠️  ${agent.name}: Already registered (tokenId: ${tokenId})`);
        continue;
      }

      const hash = await walletClient.writeContract({
        address: REGISTRY,
        abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [agent.address, agent.uri],
      });

      console.log(`⏳ ${agent.name}: ${hash.slice(0, 20)}...`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        console.log(`✅ ${agent.name}: Confirmed in block ${receipt.blockNumber}`);
      } else {
        console.log(`❌ ${agent.name}: Reverted`);
      }
    } catch (err: any) {
      console.error(`❌ ${agent.name}: ${err.shortMessage || err.message}`);
    }
  }

  console.log("\nDone.");
}

main();
