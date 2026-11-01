import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { NETWORK, NODE_URL, USDC, HARD_CAP_PER_PAYMENT } from "./config.mjs";

const decode = (b64) => {
  if (!b64) return null;
  try { return JSON.parse(Buffer.from(b64, "base64").toString("utf8")); } catch { return b64; }
};

// Ask the node for a price without paying. Returns the cheapest "exact" amount or an error.
export async function quote(body) {
  const started = Date.now();
  try {
    const res = await fetch(`${NODE_URL}/engine/v1/ask`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
    if (res.status === 402) {
      const challenge = decode(res.headers.get("payment-required"));
      const exact = challenge?.accepts?.find((a) => a.scheme === "exact" && a.network === NETWORK && a.asset?.toLowerCase() === USDC.toLowerCase());
      if (!exact) return { ok: false, status: 402, error: "No Sepolia USDC payment option offered", challenge };
      return { ok: true, amount: BigInt(exact.amount), challenge, ms: Date.now() - started };
    }
    return { ok: false, status: res.status, error: json.message || json.error || `HTTP ${res.status}`, body: json };
  } catch (e) {
    return { ok: false, status: 0, error: `Node unreachable: ${e.message || e}` };
  }
}

// One paid request. maxAmount is the most this single payment may cost, in USDC micro-units.
export async function paidAsk({ account, body, maxAmount }) {
  const cap = maxAmount < HARD_CAP_PER_PAYMENT ? maxAmount : HARD_CAP_PER_PAYMENT;
  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
    spendControls: { allowedAssets: [{ network: NETWORK, asset: USDC, maxAmountPerPayment: cap.toString() }] },
  });
  const started = Date.now();
  const evidence = {
    request: { url: `${NODE_URL}/engine/v1/ask`, method: "POST", body, payer: account.address, max_amount_micro_usdc: cap.toString() },
    started_at: new Date(started).toISOString(),
  };
  try {
    const res = await fetchWithPayment(`${NODE_URL}/engine/v1/ask`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 2000) }; }
    Object.assign(evidence, {
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      http_status: res.status,
      response: json,
      receipt: decode(res.headers.get("x-telegraph-receipt")),
      payment_response: decode(res.headers.get("payment-response")),
    });
    evidence.ok = res.status === 200;
    if (!evidence.ok) evidence.error = json.message || json.error || `HTTP ${res.status}`;
  } catch (e) {
    Object.assign(evidence, { ok: false, finished_at: new Date().toISOString(), duration_ms: Date.now() - started, error: String(e.message || e).slice(0, 500) });
  }
  return evidence;
}

// Try each intent name in turn: price it first, skip it if it has no miner or costs more than allowed.
export async function buy({ account, intents, makeBody, maxAmount }) {
  const attempts = [];
  for (const intent of intents) {
    const body = makeBody(intent);
    const q = await quote(body);
    if (!q.ok) { attempts.push({ intent, stage: "quote", ...q, challenge: undefined }); continue; }
    if (q.amount > maxAmount) {
      attempts.push({ intent, stage: "quote", ok: false, error: `Price ${q.amount} micro-USDC is over the limit of ${maxAmount}` });
      continue;
    }
    const ev = await paidAsk({ account, body, maxAmount: q.amount });
    ev.intent = intent;
    ev.quoted_micro_usdc = q.amount.toString();
    attempts.push({ intent, stage: "paid", ...ev });
    if (ev.ok) return { ok: true, intent, evidence: ev, attempts, cost: costOf(ev, q.amount) };
    // A paid call that failed may still have been charged. If it was, stop here so we
    // don't pay twice; if it wasn't, try the next intent name.
    if (!ev.payment_response) continue;
    return { ok: false, intent, evidence: ev, attempts, cost: ev.payment_response ? q.amount : 0n, error: ev.error };
  }
  const last = attempts.at(-1);
  return { ok: false, evidence: last?.stage === "paid" ? last : null, attempts, cost: 0n, error: attempts.map((a) => `${a.intent}: ${a.error}`).join("; ") };
}

function costOf(ev, quoted) {
  const c = ev.response?.cost_usd;
  return typeof c === "number" ? BigInt(Math.round(c * 1e6)) : quoted;
}
