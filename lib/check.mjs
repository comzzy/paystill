import { loadAccount } from "./wallet.mjs";
import { buy } from "./telegraph.mjs";
import { fetchTerms, changes } from "./terms.mjs";
import * as store from "./store.mjs";
import { INTENTS, HARD_CAP_PER_RENEWAL, HARD_CAP_TOTAL, DEFAULT_CAP_PER_RENEWAL, NETWORK_LABEL } from "./config.mjs";

export async function capPerRenewal() {
  const s = await store.getSettings();
  const v = s.capMicro ? BigInt(s.capMicro) : DEFAULT_CAP_PER_RENEWAL;
  return v > HARD_CAP_PER_RENEWAL ? HARD_CAP_PER_RENEWAL : v;
}

export async function totalSpent() {
  return (await store.list("check")).reduce((a, c) => a + BigInt(c.costMicro || "0"), 0n);
}

// Save the vendor's terms as they are today. Called when a subscription is added and
// again on every renewal check, so the next check has something to compare against.
export async function snapshotTerms(sub) {
  const t = await fetchTerms(sub.termsUrl);
  const snap = { subscriptionId: sub.id, url: t.url, finalUrl: t.finalUrl, sha256: t.sha256, length: t.length, text: t.text, fetchedAt: new Date().toISOString() };
  return store.put("snapshot", snap);
}

export async function latestSnapshot(subId, beforeId) {
  const snaps = (await store.list("snapshot")).filter((s) => s.subscriptionId === subId && s.id !== beforeId);
  return snaps.sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt)).at(-1) || null;
}

// Did the miner answer the question we paid for, in the shape the intent promises?
function usable(kind, ev) {
  const r = ev?.response?.result;
  if (!r || typeof r !== "object" || Array.isArray(r)) return { ok: false, why: "The miner's answer was not in the intent's shape." };
  if (kind === "terms" && !["Compliant", "Partially compliant", "Non-compliant", "Unclear"].includes(r.verdict)) return { ok: false, why: "No compliance verdict in the answer." };
  if (kind === "sla" && typeof r.uptime_pct !== "number") return { ok: false, why: "No uptime figure in the answer." };
  return { ok: true };
}

export async function runCheck(subId) {
  const sub = await store.get("subscription", subId);
  if (!sub) throw new Error("Subscription not found");
  const account = loadAccount();
  const cap = await capPerRenewal();
  const spent = await totalSpent();
  const check = { subscriptionId: sub.id, vendor: sub.vendor, startedAt: new Date().toISOString(), network: NETWORK_LABEL, capMicro: cap.toString(), problems: [] };

  // 1. Terms memory: compare today's page with the last saved copy.
  const previous = await latestSnapshot(sub.id);
  try {
    const now = await snapshotTerms(sub);
    check.terms = previous
      ? { previousHash: previous.sha256, previousAt: previous.fetchedAt, currentHash: now.sha256, changed: previous.sha256 !== now.sha256, changes: previous.sha256 !== now.sha256 ? changes(previous.text, now.text) : [] }
      : { currentHash: now.sha256, changed: null, note: "No earlier copy of these terms was saved, so there is nothing to compare yet. Today's copy is saved for next time." };
  } catch (e) {
    check.terms = { error: e.message, previousHash: previous?.sha256 || null };
    check.problems.push(`Could not read the terms page: ${e.message}`);
  }

  // 2. Telegraph purchases, in parallel, inside the spending limit.
  const jobs = [
    { kind: "terms", intents: INTENTS.terms, body: (intent) => ({ intent, params: { contract: sub.termsUrl } }) },
    sub.slaUrl || sub.slaTargetPct ? { kind: "sla", intents: INTENTS.sla, body: (intent) => ({ intent, params: { service: sub.vendor, period: "last 30 days" } }) } : null,
    sub.statusUrl ? { kind: "uptime", intents: INTENTS.uptime, body: (intent) => ({ intent, query: `Is ${sub.statusUrl} up and responding right now?` }) } : null,
  ].filter(Boolean);

  let budget = cap;
  if (spent + cap > HARD_CAP_TOTAL) budget = HARD_CAP_TOTAL > spent ? HARD_CAP_TOTAL - spent : 0n;
  if (!account) check.problems.push("No wallet key is configured, so nothing was bought.");
  const share = jobs.length ? budget / BigInt(jobs.length) : 0n;

  check.purchases = account && share > 0n
    ? await Promise.all(jobs.map(async (j) => {
        const r = await buy({ account, intents: j.intents, makeBody: j.body, maxAmount: share });
        const u = r.ok ? usable(j.kind, r.evidence) : { ok: false, why: r.error };
        return { kind: j.kind, ok: r.ok, usable: u.ok, why: u.ok ? null : u.why, intent: r.intent || j.intents.at(-1), costMicro: r.cost.toString(), evidence: r.evidence || null, attempts: r.attempts };
      }))
    : jobs.map((j) => ({ kind: j.kind, ok: false, usable: false, why: account ? "Spending limit reached." : "No wallet configured.", costMicro: "0", attempts: [] }));

  const cost = check.purchases.reduce((a, p) => a + BigInt(p.costMicro), 0n);
  check.costMicro = cost.toString();
  check.finishedAt = new Date().toISOString();
  Object.assign(check, decide(sub, check));
  return store.put("check", check);
}

// Pay / Cancel / Push back, or an honest "not enough to go on".
export function decide(sub, check) {
  const reasons = [];
  const get = (k) => check.purchases.find((p) => p.kind === k && p.usable)?.evidence?.response?.result;
  const audit = get("terms"), sla = get("sla"), up = get("uptime");
  const target = Number(sub.slaTargetPct) || sla?.sla_target_pct;

  let slaBreached = false;
  if (sla) {
    const below = target && sla.uptime_pct < target;
    slaBreached = sla.compliant === false || !!below;
    reasons.push(`Measured uptime ${sla.uptime_pct}%${target ? ` against a promised ${target}%` : ""} for ${sla.period || "the last 30 days"}.`);
  }
  if (up) reasons.push(`Status check: ${JSON.stringify(up).slice(0, 160)}`);
  if (audit) reasons.push(`Terms audit verdict: ${audit.verdict}.${audit.summary ? " " + audit.summary : ""}`);
  if (check.terms?.changed) reasons.push(`The terms page changed since ${check.terms.previousAt?.slice(0, 10)} (${check.terms.changes.length} passages differ).`);
  if (check.terms?.changed === false) reasons.push("The terms page is word-for-word the same as the saved copy.");

  for (const p of check.purchases) if (!p.usable) reasons.push(`${p.kind} check gave nothing usable: ${p.why}`);

  let decision;
  if (slaBreached || audit?.verdict === "Non-compliant") decision = "Push back";
  else if (check.terms?.changed && audit?.verdict !== "Compliant") decision = "Cancel";
  else if (!audit && !sla && !up) decision = "Not enough evidence";
  else decision = "Pay";
  return { decision, reasons };
}
