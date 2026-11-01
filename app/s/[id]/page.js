import Link from "next/link";
import { notFound } from "next/navigation";
import * as store from "../../../lib/store.mjs";
import { capPerRenewal } from "../../../lib/check.mjs";
import { checkRenewal, saveTermsNow, deleteSubscription } from "../../actions";
import { day, when, money, dclass } from "../../../lib/ui.js";

export const dynamic = "force-dynamic";

export default async function Sub({ params, searchParams }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await store.get("subscription", id);
  if (!s) notFound();
  const snaps = (await store.list("snapshot")).filter((x) => x.subscriptionId === id).sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  const checks = (await store.list("check")).filter((x) => x.subscriptionId === id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const cap = await capPerRenewal();
  return (
    <>
      <h1>{s.vendor} {s.plan && <span className="muted">· {s.plan}</span>}</h1>
      <p className="muted">{s.price ? `${s.currency} ${s.price} ${s.cycle}` : s.cycle}{s.renewsOn && ` · renews ${day(s.renewsOn)}`}</p>
      {error && <p className="alert">{error}</p>}
      <div className="card">
        <div className="row">
          <div>
            <strong>Run the renewal check</strong>
            <div className="muted small">Copies the terms again and buys the checks through Telegraph. Spends at most {money(cap)} in test USDC.</div>
          </div>
          <form action={checkRenewal}><input type="hidden" name="id" value={s.id} /><button className="btn">Check now</button></form>
        </div>
      </div>

      <h2>Past checks</h2>
      {checks.length === 0 ? <p className="muted">None yet.</p> : (
        <div className="list">
          {checks.map((c) => (
            <Link key={c.id} href={`/checks/${c.id}`} className="card">
              <div className="row"><span>{when(c.startedAt)}</span><span><span className={`decision ${dclass(c.decision)}`} style={{ fontSize: 14 }}>{c.decision}</span> <span className="muted small">cost {money(c.costMicro)}</span></span></div>
            </Link>
          ))}
        </div>
      )}

      <h2>Saved copies of the terms</h2>
      <p className="small muted"><a href={s.termsUrl} target="_blank" rel="noreferrer">{s.termsUrl}</a></p>
      {snaps.length === 0 ? <p className="muted">No copy saved yet.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Saved</th><th>SHA-256</th><th className="hide-sm">Characters</th></tr></thead>
          <tbody>{snaps.map((x, i) => (
            <tr key={x.id}><td>{when(x.fetchedAt)}</td><td className="mono">{x.sha256.slice(0, 16)}…{snaps[i + 1] && snaps[i + 1].sha256 !== x.sha256 && <span className="tag bad">changed</span>}</td><td className="hide-sm">{x.length.toLocaleString()}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <div className="row" style={{ marginTop: 16, justifyContent: "flex-start" }}>
        <form action={saveTermsNow}><input type="hidden" name="id" value={s.id} /><button className="btn light">Save a copy now</button></form>
        <form action={deleteSubscription}><input type="hidden" name="id" value={s.id} /><button className="btn danger">Remove</button></form>
      </div>
      {(s.slaUrl || s.statusUrl || s.slaTargetPct) && (
        <p className="small muted" style={{ marginTop: 20 }}>
          {s.slaTargetPct && <>Promised uptime {s.slaTargetPct}%. </>}
          {s.slaUrl && <>SLA: <a href={s.slaUrl}>{s.slaUrl}</a>. </>}
          {s.statusUrl && <>Status: <a href={s.statusUrl}>{s.statusUrl}</a>.</>}
        </p>
      )}
    </>
  );
}
