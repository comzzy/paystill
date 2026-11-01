import { formatEther } from "viem";
import { loadAccount } from "../../lib/wallet.mjs";
import { balances } from "../../lib/chain.mjs";
import { capPerRenewal, totalSpent } from "../../lib/check.mjs";
import { storeKind } from "../../lib/store.mjs";
import { saveSettings } from "../actions";
import { HARD_CAP_PER_RENEWAL, HARD_CAP_PER_PAYMENT, HARD_CAP_TOTAL, NODE_URL, NETWORK_LABEL } from "../../lib/config.mjs";
import { money } from "../../lib/ui.js";

export const dynamic = "force-dynamic";

export default async function Settings({ searchParams }) {
  const { saved } = await searchParams;
  const account = loadAccount();
  const b = account ? await balances(account.address) : null;
  const cap = await capPerRenewal();
  const spent = await totalSpent();
  return (
    <>
      <h1>Settings</h1>
      {saved && <p className="okmsg">Saved.</p>}
      <h2>Spending limit</h2>
      <form action={saveSettings} className="card stack">
        <label>Most one renewal check may spend, in test USDC<span>Split evenly across the checks it buys. The code won't go above {money(HARD_CAP_PER_RENEWAL)} per check, {money(HARD_CAP_PER_PAYMENT)} per request, or {money(HARD_CAP_TOTAL)} in total.</span>
          <input name="cap" type="number" step="0.01" min="0" max={Number(HARD_CAP_PER_RENEWAL) / 1e6} defaultValue={(Number(cap) / 1e6).toFixed(2)} />
        </label>
        <div><button className="btn">Save</button></div>
      </form>
      <p className="small muted">Spent so far: {money(spent)} of {money(HARD_CAP_TOTAL)}.</p>
      <h2>Wallet</h2>
      <div className="card small">
        <div>Network: {NETWORK_LABEL}</div>
        <div>Telegraph node: {NODE_URL}</div>
        {account ? <>
          <div>Address: <a className="mono" href={`https://sepolia.etherscan.io/address/${account.address}`} target="_blank" rel="noreferrer">{account.address}</a></div>
          {b?.ok ? <div>Balance: {Number(formatEther(b.eth)).toFixed(4)} ETH · {(Number(b.usdc) / 1e6).toFixed(2)} test USDC</div> : <div className="alert">Couldn't read balances: {b?.error}</div>}
        </> : <div className="alert">No wallet key configured. Set PAYSTILL_WALLET_KEY or create .secrets/wallet.key. See the README.</div>}
        <div>Storage: {storeKind()}</div>
      </div>
    </>
  );
}
