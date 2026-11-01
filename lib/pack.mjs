// The note you send the vendor before renewal when Paystill says Push back or Cancel.
// Every claim in it points at a paid Telegraph receipt or a saved copy of the terms.
export function negotiationPack(sub, check) {
  const res = (k) => check.purchases.find((p) => p.kind === k && p.usable);
  const sla = res("sla"), audit = res("terms");
  const lines = [];
  lines.push(`Subject: ${sub.vendor}${sub.plan ? " " + sub.plan : ""} renewal${sub.renewsOn ? " on " + sub.renewsOn : ""}`);
  lines.push("");
  lines.push("Hi,");
  lines.push("");
  lines.push(`Our ${sub.vendor} subscription${sub.price ? ` (${sub.currency} ${sub.price} ${sub.cycle})` : ""} is coming up for renewal and I'd like to sort a couple of things out before it does.`);
  lines.push("");
  if (sla) {
    const r = sla.evidence.response.result;
    const target = sub.slaTargetPct || r.sla_target_pct;
    lines.push(`Uptime: an independent check measured ${r.uptime_pct}% over ${r.period || "the last 30 days"}${target ? `, against the ${target}% in your SLA` : ""}${sub.slaUrl ? ` (${sub.slaUrl})` : ""}.`);
  }
  if (check.terms?.changed) {
    lines.push(`Terms: the wording at ${sub.termsUrl} has changed since ${check.terms.previousAt?.slice(0, 10)}. The passages that differ:`);
    for (const c of check.terms.changes.slice(0, 5)) lines.push(`  ${c.type === "added" ? "+" : "-"} ${c.text.slice(0, 280)}`);
  }
  if (audit) {
    const r = audit.evidence.response.result;
    lines.push(`A review of the agreement came back "${r.verdict}".${r.summary ? " " + r.summary : ""}`);
  }
  lines.push("");
  lines.push(check.decision === "Push back"
    ? "Given that, I'd like a service credit or a discount on the renewal. Can you tell me what you can offer before the renewal date?"
    : "Before we renew, can you confirm what changed and whether our current price and terms still apply? If not, we'll likely cancel.");
  lines.push("");
  lines.push("Evidence (each check was paid for and recorded on Ethereum Sepolia testnet):");
  for (const p of check.purchases.filter((p) => p.ok)) {
    const r = p.evidence.receipt || {};
    lines.push(`  ${p.intent}: signal ${p.evidence.response?.signal_hash || "n/a"}, tx ${r.tx_hash || p.evidence.payment_response?.transaction || "n/a"}`);
  }
  if (check.terms?.currentHash) lines.push(`  Terms copy SHA-256: ${check.terms.currentHash}${check.terms.previousHash ? ` (was ${check.terms.previousHash})` : ""}`);
  lines.push("");
  lines.push("Thanks,");
  return lines.join("\n");
}
