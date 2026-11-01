import Link from "next/link";
import * as store from "../lib/store.mjs";
import { day, daysUntil, dclass } from "../lib/ui.js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const subs = (await store.list("subscription")).sort((a, b) => (a.renewsOn || "9").localeCompare(b.renewsOn || "9"));
  const checks = await store.list("check");
  const last = (id) => checks.filter((c) => c.subscriptionId === id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return (
    <>
      <div className="row">
        <div>
          <h1>Renewals</h1>
          <p className="muted">Each subscription gets checked before it renews: are the terms the same, did the service keep its promises, and is it still worth paying.</p>
        </div>
        <Link className="btn" href="/add">Add a subscription</Link>
      </div>
      {subs.length === 0 ? (
        <div className="card empty">
          <p><strong>No subscriptions yet.</strong></p>
          <p className="muted">Add the tools you pay for, with a link to each one's terms or SLA page. Paystill saves a copy of the terms today so it can tell you what changed by renewal day.</p>
          <Link className="btn" href="/add">Add the first one</Link>
        </div>
      ) : (
        <div className="list">
          {subs.map((s) => {
            const c = last(s.id), n = daysUntil(s.renewsOn);
            return (
              <Link key={s.id} href={`/s/${s.id}`} className="card">
                <div className="row">
                  <div>
                    <strong>{s.vendor}</strong> {s.plan && <span className="muted">· {s.plan}</span>}
                    <div className="muted small">
                      {s.price ? `${s.currency} ${s.price} ${s.cycle}` : s.cycle}
                      {s.renewsOn && ` · renews ${day(s.renewsOn)}${n != null && n >= 0 ? ` (in ${n} day${n === 1 ? "" : "s"})` : n != null ? " (date passed)" : ""}`}
                    </div>
                  </div>
                  {c ? <span className={`decision ${dclass(c.decision)}`} style={{ fontSize: 14 }}>{c.decision}</span> : <span className="tag">Not checked yet</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
