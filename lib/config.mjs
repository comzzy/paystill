// Everything here runs on Ethereum Sepolia testnet. Nothing touches real money.
export const NETWORK = "eip155:11155111";
export const NETWORK_LABEL = "Ethereum Sepolia testnet";
export const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
export const NODE_URL = process.env.TELEGRAPH_NODE_URL || "https://devnode.telegraphprotocol.com";
export const USDC = "0xcc194e1a843B658526D0D5C431f670028582Ae17";

// Hard limits, in USDC micro-units (1 USDC = 1_000_000). The spending limit in the
// app's settings can be set lower than these, never higher.
export const HARD_CAP_PER_PAYMENT = 50_000n; //   $0.05 for any single request
export const HARD_CAP_PER_RENEWAL = 250_000n; //  $0.25 for one renewal check
export const HARD_CAP_TOTAL = 3_000_000n; //      $3.00 across all checks ever recorded
export const DEFAULT_CAP_PER_RENEWAL = 50_000n; // $0.05

// The Telegraph intents Paystill buys. The plain names have no live miners on the
// testnet node right now; the _GENERAL variants do. Both are tried, in this order.
export const INTENTS = {
  terms: ["CONTRACT_OBLIGATION_AUDIT", "CONTRACT_OBLIGATION_AUDIT_GENERAL"],
  sla: ["SLA_COMPLIANCE", "SLA_COMPLIANCE_GENERAL"],
  uptime: ["SERVER_UPTIME_MONITOR", "SERVER_UPTIME_MONITOR_GENERAL"],
};

export const usd = (micro) => `$${(Number(micro) / 1e6).toFixed(micro % 10000n === 0n ? 2 : 4)}`;
