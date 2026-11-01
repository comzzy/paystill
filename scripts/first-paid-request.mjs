// Makes one real paid x402 request to the Telegraph testnet node: a CONTRACT_OBLIGATION_AUDIT
// of a real public SLA page. Saves the request, response, receipt and settlement to evidence/.
//
//   node scripts/first-paid-request.mjs [url]
//
// Default URL: Vercel's public SLA page. Pays at most $0.05 in Sepolia test USDC.
import fs from "node:fs";
import path from "node:path";
import { loadAccount } from "../lib/wallet.mjs";
import { balances } from "../lib/chain.mjs";
import { buy } from "../lib/telegraph.mjs";
import { INTENTS, NETWORK_LABEL, NODE_URL, usd } from "../lib/config.mjs";

const url = process.argv[2] || "https://vercel.com/legal/sla";
const MAX = 50_000n; // $0.05

const account = loadAccount();
if (!account) { console.error("No wallet key in .secrets/wallet.key or PAYSTILL_WALLET_KEY."); process.exit(1); }
console.log(`${NETWORK_LABEL}, node ${NODE_URL}`);
console.log(`Payer ${account.address}`);

const b = await balances(account.address);
if (b.ok && b.usdc < MAX) {
  console.error(`The wallet holds ${usd(b.usdc)} test USDC, less than the $0.05 limit for this request. Fund it first (see README).`);
  process.exit(1);
}

const result = await buy({
  account,
  intents: INTENTS.terms,
  makeBody: (intent) => ({ intent, params: { contract: url } }),
  maxAmount: MAX,
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join("evidence", `first-paid-request-${stamp}.json`);
fs.mkdirSync("evidence", { recursive: true });
fs.writeFileSync(file, JSON.stringify({ network: NETWORK_LABEL, node: NODE_URL, target: url, ...result, cost_micro_usdc: result.cost.toString() }, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

if (result.ok) {
  const r = result.evidence.response;
  console.log(`Paid ${usd(result.cost)} for ${result.intent}, miner ${r.miner_name || r.miner_id}, ${result.evidence.duration_ms} ms`);
  console.log(`Verdict: ${r.result?.verdict ?? "(none)"}`);
  console.log(`Signal hash: ${r.signal_hash}`);
} else {
  console.error(`Request did not complete: ${result.error}`);
}
console.log(`Evidence saved to ${file}`);
process.exit(result.ok ? 0 : 2);
