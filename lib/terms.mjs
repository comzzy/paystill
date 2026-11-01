import crypto from "node:crypto";
import { diffSentences } from "diff";

// Fetch a public terms or SLA page and reduce it to plain text so the hash only
// changes when the wording changes, not when a script tag or tracking ID does.
export async function fetchTerms(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Paystill/0.1 (+https://github.com/comzzy/paystill)", Accept: "text/html,text/plain" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`The page answered HTTP ${res.status}`);
  const html = await res.text();
  const text = toText(html);
  if (text.length < 200) throw new Error("The page has almost no readable text. It may need JavaScript to load.");
  return { url, finalUrl: res.url, text, sha256: sha256(text), length: text.length };
}

export function toText(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Sentence-level changes between two snapshots, capped so a full rewrite stays readable.
export function changes(before, after, limit = 40) {
  const parts = diffSentences(before, after);
  const out = [];
  for (const p of parts) {
    if (!p.added && !p.removed) continue;
    const text = p.value.trim();
    if (!text) continue;
    out.push({ type: p.added ? "added" : "removed", text: text.length > 600 ? text.slice(0, 600) + "…" : text });
    if (out.length >= limit) break;
  }
  return out;
}
