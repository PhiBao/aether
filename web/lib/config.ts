import { createConfig, http } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [mantle, mantleSepoliaTestnet],
  connectors: [injected()],
  transports: {
    [mantle.id]: http("https://rpc.mantle.xyz"),
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});

export const CONTRACTS = {
  mantleSepoliaTestnet: {
    AgentRegistry: "0x6792E51FBD24f9315282BD5b6c5E713dCc779C69",
    SignalLogger: "0xc6168fa5153E7AF6aFf0013D99A2B8D9670a1454",
    StrategyVault: "0xD4f72d31D66cA11Cdfd428cDc08B438D2681362B",
  },
  mantle: {
    AgentRegistry: "",
    SignalLogger: "",
    StrategyVault: "",
  },
} as const;

export const AGENT_REGISTRY_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [{ "internalType": "address", "name": "agent", "type": "address" }],
    "name": "AgentRegistry__AlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "address", "name": "agent", "type": "address" }],
    "name": "AgentRegistry__AgentNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AgentRegistry__InvalidScore",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "address", "name": "caller", "type": "address" }],
    "name": "AgentRegistry__NotAgentOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AgentRegistry__TransferNotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AgentRegistry__ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "AgentRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "int256", "name": "newScore", "type": "int256" },
      { "indexed": false, "internalType": "uint256", "name": "totalTrades", "type": "uint256" }
    ],
    "name": "ReputationUpdated",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "agentToTokenId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "authorizedUpdaters",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }],
    "name": "deactivateAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }],
    "name": "getProfile",
    "outputs": [{
      "components": [
        { "internalType": "address", "name": "agentAddress", "type": "address" },
        { "internalType": "int256", "name": "reputationScore", "type": "int256" },
        { "internalType": "uint256", "name": "tradeCount", "type": "uint256" },
        { "internalType": "uint256", "name": "registerTime", "type": "uint256" },
        { "internalType": "bytes32[]", "name": "skills", "type": "bytes32[]" },
        { "internalType": "string", "name": "metadataURI", "type": "string" },
        { "internalType": "bool", "name": "active", "type": "bool" }
      ],
      "internalType": "struct AgentRegistry.AgentProfile",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_agentWallet", "type": "address" }, { "internalType": "string", "name": "_metadataURI", "type": "string" }],
    "name": "registerAgent",
    "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "int256", "name": "_tradePnL", "type": "int256" }, { "internalType": "bytes32", "name": "_tradeHash", "type": "bytes32" }],
    "name": "recordTrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "int256[]", "name": "_pnls", "type": "int256[]" }],
    "name": "recordTradeBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_updater", "type": "address" }, { "internalType": "bool", "name": "_authorized", "type": "bool" }],
    "name": "setAuthorizedUpdater",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }, { "internalType": "address", "name": "_newAgent", "type": "address" }],
    "name": "updateAgentAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const SIGNAL_LOGGER_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "SignalLogger__InvalidSignal",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SignalLogger__NotAuthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SignalLogger__Paused",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "signalId", "type": "uint256" },
      { "indexed": true, "internalType": "bytes32", "name": "txHash", "type": "bytes32" },
      { "indexed": false, "internalType": "bool", "name": "executed", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "size", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "entryPrice", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "slippageBps", "type": "uint256" }
    ],
    "name": "ExecutionLogged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "signalId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "symbol", "type": "string" },
      { "indexed": false, "internalType": "int8", "name": "direction", "type": "int8" },
      { "indexed": false, "internalType": "uint16", "name": "confidenceBps", "type": "uint16" },
      { "indexed": false, "internalType": "int256", "name": "vibeScore", "type": "int256" },
      { "indexed": false, "internalType": "bytes32", "name": "strategyHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "SignalLogged",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_signalId", "type": "uint256" }],
    "name": "getExecution",
    "outputs": [{
      "components": [
        { "internalType": "uint256", "name": "signalId", "type": "uint256" },
        { "internalType": "bytes32", "name": "txHash", "type": "bytes32" },
        { "internalType": "bool", "name": "executed", "type": "bool" },
        { "internalType": "uint256", "name": "size", "type": "uint256" },
        { "internalType": "uint256", "name": "entryPrice", "type": "uint256" },
        { "internalType": "uint256", "name": "slippageBps", "type": "uint256" }
      ],
      "internalType": "struct SignalLogger.Execution",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_signalId", "type": "uint256" }],
    "name": "getSignal",
    "outputs": [{
      "components": [
        { "internalType": "uint256", "name": "id", "type": "uint256" },
        { "internalType": "address", "name": "agent", "type": "address" },
        { "internalType": "string", "name": "symbol", "type": "string" },
        { "internalType": "int8", "name": "direction", "type": "int8" },
        { "internalType": "uint16", "name": "confidenceBps", "type": "uint16" },
        { "internalType": "int256", "name": "vibeScore", "type": "int256" },
        { "internalType": "bytes32", "name": "strategyHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "blockTimestamp", "type": "uint256" },
        { "internalType": "uint256", "name": "blockNumber", "type": "uint256" }
      ],
      "internalType": "struct SignalLogger.Signal",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_agent", "type": "address" },
      { "internalType": "string", "name": "_symbol", "type": "string" },
      { "internalType": "int8", "name": "_direction", "type": "int8" },
      { "internalType": "uint16", "name": "_confidenceBps", "type": "uint16" },
      { "internalType": "int256", "name": "_vibeScore", "type": "int256" },
      { "internalType": "bytes32", "name": "_strategyHash", "type": "bytes32" }
    ],
    "name": "logSignal",
    "outputs": [{ "internalType": "uint256", "name": "signalId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
