import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import * as store from "../../lib/store.mjs";
import { when, money, tx } from "../../lib/ui.js";

export const dynamic = "force-dynamic";

function scriptRuns() {
  const dir = path.join(process.cwd(), "evidence");
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().reverse().map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { file: f, ...d };
    });
  } catch { return []; }
}

export default async function Evidence() {
  const checks = (await store.list("check")).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const rows = checks.flatMap((c) => c.purchases.filter((p) => p.ok || p.evidence).map((p) => ({ c, p })));
  const runs = scriptRuns();
  const total = checks.reduce((a, c) => a + Number(c.costMicro || 0), 0);
  return (
    <>
      <h1>Receipts</h1>
      <p className="muted">Every paid Telegraph request, with the receipt the node returned and the settlement transaction on Sepolia. Total spent by renewal checks: {money(total)} test USDC.</p>
      {rows.length === 0 && runs.length === 0 && <div className="card empty muted">No paid requests yet.</div>}
      {rows.map(({ c, p }, i) => <Receipt key={i} title={`${c.vendor} · ${p.intent}`} at={c.startedAt} ev={p.evidence} cost={p.costMicro} href={`/checks/${c.id}`} />)}
      {runs.length > 0 && <h2>From the command-line script</h2>}
      {runs.map((r) => <Receipt key={r.file} title={`${r.intent || "request"} · ${r.target}`} at={r.evidence?.started_at} ev={r.evidence} cost={r.cost_micro_usdc} file={r.file} />)}
    </>
  );
}

function Receipt({ title, at, ev, cost, href, file }) {
  if (!ev) return null;
  const rc = ev.receipt || {};
  return (
    <div className="card">
      <div className="row"><strong>{href ? <Link href={href}>{title}</Link> : title}</strong><span className={`tag ${ev.ok ? "ok" : "bad"}`}>{ev.ok ? `HTTP ${ev.http_status}` : ev.error?.slice(0, 60)}</span></div>
      <div className="small muted">{when(at)} · {money(cost)} · {ev.duration_ms} ms{file && <> · evidence/{file}</>}</div>
      <div className="small" style={{ marginTop: 8 }}>
        {ev.response?.miner_name && <div>Miner: {ev.response.miner_name} ({ev.response.miner_id})</div>}
        {ev.response?.signal_hash && <div>Signal: <span className="mono">{ev.response.signal_hash}</span></div>}
        {rc.receipt_hash && <div>Receipt: <span className="mono">{rc.receipt_hash}</span></div>}
        {rc.tx_hash && <div>Settlement: <a className="mono" href={tx(rc.tx_hash)} target="_blank" rel="noreferrer">{rc.tx_hash}</a></div>}
        {rc.payer && <div>Payer: <span className="mono">{rc.payer}</span></div>}
      </div>
      <details style={{ marginTop: 8 }}><summary className="small">Full request and response</summary><pre>{JSON.stringify({ request: ev.request, response: ev.response, receipt: ev.receipt, payment_response: ev.payment_response }, null, 2).slice(0, 8000)}</pre></details>
    </div>
  );
}
