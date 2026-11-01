import { addSubscription } from "../actions";

export default async function Add({ searchParams }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Add a subscription</h1>
      <p className="muted">Use the vendor's real public pages. The terms link is required. The others make the check more useful.</p>
      {error && <p className="alert">{error}</p>}
      <form action={addSubscription} className="stack">
        <div className="grid2">
          <label>Vendor<input name="vendor" required placeholder="e.g. Vercel" /></label>
          <label>Plan<input name="plan" placeholder="e.g. Pro" /></label>
        </div>
        <div className="grid2">
          <label>Price<input name="price" type="number" step="0.01" min="0" /></label>
          <label>Currency<input name="currency" defaultValue="USD" maxLength={3} /></label>
        </div>
        <div className="grid2">
          <label>Billed<select name="cycle"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <label>Next renewal<input name="renewsOn" type="date" /></label>
        </div>
        <label>Terms or SLA page<span>The page whose wording you agreed to. A copy is saved and hashed now.</span><input name="termsUrl" type="url" required placeholder="https://" /></label>
        <label>SLA page (optional)<span>If the uptime promise is on a separate page.</span><input name="slaUrl" type="url" placeholder="https://" /></label>
        <div className="grid2">
          <label>Promised uptime %<span>From the SLA, if there is one.</span><input name="slaTargetPct" type="number" step="0.001" min="0" max="100" /></label>
          <label>Status page or endpoint<span>Used for the live uptime check.</span><input name="statusUrl" type="url" placeholder="https://" /></label>
        </div>
        <div><button className="btn">Save and copy the terms</button></div>
      </form>
    </>
  );
}
