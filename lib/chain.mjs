import { createPublicClient, http, erc20Abi } from "viem";
import { sepolia } from "viem/chains";
import { RPC_URL, USDC } from "./config.mjs";

export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

export async function balances(address) {
  try {
    const [eth, usdc] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
    ]);
    return { eth, usdc, ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}
