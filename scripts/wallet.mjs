// Usage:
//   node scripts/wallet.mjs            show the Paystill wallet address and Sepolia balances
//   node scripts/wallet.mjs mint       mint 10 test USDC to it (needs a little Sepolia ETH for gas)
// The private key is read from .secrets/wallet.key or PAYSTILL_WALLET_KEY and is never printed.
import { createWalletClient, http, parseAbi, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { loadAccount } from "../lib/wallet.mjs";
import { balances, publicClient } from "../lib/chain.mjs";
import { RPC_URL, USDC, NETWORK_LABEL } from "../lib/config.mjs";

const account = loadAccount();
if (!account) { console.error("No wallet key found. Put one in .secrets/wallet.key (chmod 600)."); process.exit(1); }
console.log(`Network: ${NETWORK_LABEL}`);
console.log(`Address: ${account.address}`);
const show = async () => {
  const b = await balances(account.address);
  if (!b.ok) return console.log(`Could not read balances: ${b.error}`);
  console.log(`ETH:  ${formatEther(b.eth)}`);
  console.log(`USDC: ${(Number(b.usdc) / 1e6).toFixed(6)} (test token)`);
  return b;
};
const b = await show();
if (process.argv[2] === "mint") {
  if (!b?.ok || b.eth === 0n) { console.error("The wallet has no Sepolia ETH for gas yet. Fund it from a faucet first."); process.exit(1); }
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });
  const hash = await wallet.writeContract({ address: USDC, abi: parseAbi(["function mint(address,uint256)"]), functionName: "mint", args: [account.address, 10_000_000n] });
  console.log(`Mint tx: https://sepolia.etherscan.io/tx/${hash}`);
  const r = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Status: ${r.status}`);
  await new Promise((s) => setTimeout(s, 4000));
  await show();
}
