export const dclass = (d) => ({ Pay: "d-pay", Cancel: "d-cancel", "Push back": "d-push" }[d] || "d-none");
export const money = (micro) => `$${(Number(micro || 0) / 1e6).toFixed(Number(micro) % 10000 === 0 ? 2 : 4)}`;
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export const when = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "");
export const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000) : null);
export const tx = (h) => (h ? `https://sepolia.etherscan.io/tx/${h}` : null);
