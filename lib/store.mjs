// Storage. With DATABASE_URL set (Neon Postgres), everything lives in one table of JSON
// documents. Without it, a local file at data/paystill.json is used. On Vercel, set
// DATABASE_URL: the local file would be lost between requests.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Vercel functions can only write to /tmp, and that copy is lost when the instance stops.
const FILE = process.env.VERCEL ? "/tmp/paystill.json" : path.join(process.cwd(), "data", "paystill.json");
const EMPTY = { settings: {}, subscriptions: [], snapshots: [], checks: [] };

let sql = null;
async function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!sql) {
    const { neon } = await import("@neondatabase/serverless");
    sql = neon(process.env.DATABASE_URL);
    await sql`create table if not exists paystill_docs (kind text not null, id text not null, body jsonb not null, created_at timestamptz default now(), primary key (kind, id))`;
  }
  return sql;
}

function readFile() {
  try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch { return structuredClone(EMPTY); }
}
function writeFile(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const KINDS = { subscription: "subscriptions", snapshot: "snapshots", check: "checks" };

export async function list(kind) {
  const s = await db();
  if (s) {
    const rows = await s`select body from paystill_docs where kind = ${kind} order by created_at`;
    return rows.map((r) => r.body);
  }
  return readFile()[KINDS[kind]];
}

export async function get(kind, id) {
  return (await list(kind)).find((x) => x.id === id) || null;
}

export async function put(kind, doc) {
  if (!doc.id) doc.id = crypto.randomUUID().slice(0, 8);
  const s = await db();
  if (s) {
    await s`insert into paystill_docs (kind, id, body) values (${kind}, ${doc.id}, ${JSON.stringify(doc)}::jsonb)
            on conflict (kind, id) do update set body = excluded.body`;
    return doc;
  }
  const data = readFile();
  const arr = data[KINDS[kind]];
  const i = arr.findIndex((x) => x.id === doc.id);
  if (i >= 0) arr[i] = doc; else arr.push(doc);
  writeFile(data);
  return doc;
}

export async function remove(kind, id) {
  const s = await db();
  if (s) { await s`delete from paystill_docs where kind = ${kind} and id = ${id}`; return; }
  const data = readFile();
  data[KINDS[kind]] = data[KINDS[kind]].filter((x) => x.id !== id);
  writeFile(data);
}

export async function getSettings() {
  const s = await db();
  if (s) {
    const rows = await s`select body from paystill_docs where kind = 'settings' and id = 'main'`;
    return rows[0]?.body || {};
  }
  return readFile().settings || {};
}

export async function saveSettings(settings) {
  const s = await db();
  if (s) {
    await s`insert into paystill_docs (kind, id, body) values ('settings', 'main', ${JSON.stringify(settings)}::jsonb)
            on conflict (kind, id) do update set body = excluded.body`;
    return;
  }
  const data = readFile();
  data.settings = settings;
  writeFile(data);
}

export const storeKind = () => (process.env.DATABASE_URL ? "Neon Postgres" : process.env.VERCEL ? "temporary file (/tmp, lost on redeploy; connect Neon to keep data)" : "local file (data/paystill.json)");
