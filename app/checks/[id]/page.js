import Link from "next/link";
import { notFound } from "next/navigation";
import * as store from "../../../lib/store.mjs";
import { negotiationPack } from "../../../lib/pack.mjs";
import { when, money, dclass, tx } from "../../../lib/ui.js";

export const dynamic = "force-dynamic";
const label = { terms: "Terms audit", sla: "SLA compliance", uptime: "Live uptime" };

export default async function Memo({ params }) {
  const { id } = await params;
  const c = await store.get("check", id);
  if (!c) notFound();
  const s = await store.get("subscription", c.subscriptionId);
  const renewal = s?.price ? s.price : null;
  return (
    <>
      <p className="small muted"><Link href={`/s/${c.subscriptionId}`}>← {c.vendor}</Link></p>
      <h1>Renewal memo: {c.vendor}</h1>
      <p className="muted small">{when(c.startedAt)} · {c.network}</p>
      <div className="card">
        <span className={`decision ${dclass(c.decision)}`}>{c.decision}</span>
        <ul>{c.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        {c.problems?.length > 0 && <div className="alert small">{c.problems.join(" ")}</div>}
      </div>

      <h2>Terms</h2>
      <div className="card">
        {c.terms?.error ? <p className="alert">{c.terms.error}</p>
          : c.terms?.changed == null ? <p>{c.terms?.note}</p>
          : c.terms.changed === false ? <p>No change. Hash <span className="mono">{c.terms.currentHash.slice(0, 16)}…</span> matches the copy from {when(c.terms.previousAt)}.</p>
          : <>
              <p>Changed since {when(c.terms.previousAt)}.</p>
              {c.terms.changes.map((x, i) => <div key={i} className={`change ${x.type}`}>{x.text}</div>)}
            </>}
      </div>

      <h2>Checks bought through Telegraph</h2>
      <div className="scroll"><table>
        <thead><tr><th>Check</th><th>Result</th><th>Cost</th><th className="hide-sm">Receipt</th></tr></thead>
        <tbody>{c.purchases.map((p, i) => {
          const r = p.evidence?.response, rc = p.evidence?.receipt;
          return (
            <tr key={i}>
              <td>{label[p.kind]}<div className="small muted mono">{p.intent}</div></td>
              <td>{p.usable ? <span className="tag ok">usable</span> : p.ok ? <span className="tag bad">paid, answer unusable</span> : p.costMicro !== "0" ? <span className="tag bad">paid, call failed</span> : <span className="tag bad">not bought</span>}
                {p.why && <div className="small muted">{p.why}</div>}
                {r?.miner_name && <div className="small muted">miner {r.miner_name} ({r.miner_id}), {p.evidence.duration_ms} ms</div>}
              </td>
              <td>{money(p.costMicro)}</td>
              <td className="hide-sm small">{rc?.tx_hash ? <a className="mono" href={tx(rc.tx_hash)} target="_blank" rel="noreferrer">{rc.tx_hash.slice(0, 12)}…</a> : "–"}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <div className="costline row">
        <span>Cost of this decision</span>
        <span>{money(c.costMicro)} test USDC{renewal ? ` against a ${s.currency} ${renewal} renewal` : ""} · limit {money(c.capMicro)}</span>
      </div>

      {(c.decision === "Push back" || c.decision === "Cancel") && s && (
        <>
          <h2>Note to the vendor</h2>
          <p className="muted small">Copy this, edit it, and send it yourself. Paystill doesn't send anything.</p>
          <pre>{negotiationPack(s, c)}</pre>
        </>
      )}
      <p className="small" style={{ marginTop: 24 }}><Link href="/evidence">All receipts</Link></p>
    </>
  );
}
