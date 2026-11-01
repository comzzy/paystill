import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";

// The key comes from PAYSTILL_WALLET_KEY or the gitignored .secrets/wallet.key file.
// It is never logged, returned to the browser or written anywhere else.
export function loadAccount() {
  let key = process.env.PAYSTILL_WALLET_KEY;
  if (!key) {
    const file = path.join(process.cwd(), ".secrets", "wallet.key");
    if (fs.existsSync(file)) key = fs.readFileSync(file, "utf8").trim();
  }
  if (!key) return null;
  return privateKeyToAccount(key);
}
