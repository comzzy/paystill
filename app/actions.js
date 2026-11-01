"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as store from "../lib/store.mjs";
import { snapshotTerms, runCheck } from "../lib/check.mjs";
import { HARD_CAP_PER_RENEWAL } from "../lib/config.mjs";

const url = (v) => { const s = String(v || "").trim(); if (!s) return ""; const u = new URL(s); if (!/^https?:$/.test(u.protocol)) throw new Error("bad url"); return u.toString(); };

export async function addSubscription(form) {
  let sub;
  try {
    sub = {
      vendor: String(form.get("vendor")).trim(),
      plan: String(form.get("plan") || "").trim(),
      price: Number(form.get("price")) || null,
      currency: String(form.get("currency") || "USD").trim().toUpperCase(),
      cycle: form.get("cycle") === "yearly" ? "yearly" : "monthly",
      renewsOn: String(form.get("renewsOn") || ""),
      termsUrl: url(form.get("termsUrl")),
      slaUrl: url(form.get("slaUrl")),
      slaTargetPct: Number(form.get("slaTargetPct")) || null,
      statusUrl: url(form.get("statusUrl")),
      createdAt: new Date().toISOString(),
    };
  } catch { redirect("/add?error=" + encodeURIComponent("One of the links isn't a valid http(s) address.")); }
  if (!sub.vendor || !sub.termsUrl) redirect("/add?error=" + encodeURIComponent("Vendor and terms link are required."));
  await store.put("subscription", sub);
  let note = "";
  try { await snapshotTerms(sub); } catch (e) { note = "?error=" + encodeURIComponent(`Saved, but the terms page couldn't be read: ${e.message}`); }
  revalidatePath("/");
  redirect(`/s/${sub.id}${note}`);
}

export async function deleteSubscription(form) {
  await store.remove("subscription", String(form.get("id")));
  revalidatePath("/");
  redirect("/");
}

export async function saveTermsNow(form) {
  const sub = await store.get("subscription", String(form.get("id")));
  let q = "";
  try { await snapshotTerms(sub); } catch (e) { q = "?error=" + encodeURIComponent(e.message); }
  redirect(`/s/${sub.id}${q}`);
}

export async function checkRenewal(form) {
  const check = await runCheck(String(form.get("id")));
  redirect(`/checks/${check.id}`);
}

export async function saveSettings(form) {
  const dollars = Number(form.get("cap"));
  let micro = BigInt(Math.max(0, Math.round((Number.isFinite(dollars) ? dollars : 0) * 1e6)));
  if (micro > HARD_CAP_PER_RENEWAL) micro = HARD_CAP_PER_RENEWAL;
  await store.saveSettings({ ...(await store.getSettings()), capMicro: micro.toString() });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
