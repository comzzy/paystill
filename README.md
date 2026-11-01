# Paystill

Paystill helps a small team decide what to do before a SaaS subscription renews: pay it, cancel it, or push back on price.

For each renewal it:

1. Saves a copy of the vendor's terms page along with its sha256 hash, then shows exactly which sentences changed since the last copy.
2. Buys up to three independent checks through [Telegraph](https://telegraphprotocol.com) at the same time, paying with x402: a terms obligation audit, an SLA compliance check and a live uptime check. Each purchase is held to a spending limit per renewal.
3. Writes a short memo with one of four outcomes: **Pay**, **Cancel**, **Push back** or **Not enough evidence**. The memo lists every purchase with its cost, receipt and settlement transaction, plus what the whole decision cost.
4. On Push back or Cancel, drafts an email to the vendor that cites the uptime figures, the terms changes and the receipt hashes.

There's no sample data. The list starts empty and you add your own subscriptions using the vendor's public terms, SLA and status pages.

## Network and costs

- Network: **Ethereum Sepolia testnet** (eip155:11155111). Payments use test USDC (`0xcc194e1a843B658526D0D5C431f670028582Ae17`), which has no real value.
- Each Telegraph check currently costs $0.01 test USDC, so a full renewal check costs at most $0.03.
- Limits in `lib/config.mjs` that the settings page can't raise:
  - $0.05 per payment
  - $0.25 per renewal
  - $3.00 in total
- The default limit per renewal is $0.05, and you can change it on the Settings page.

## Run it

```bash
npm install
mkdir -p .secrets && chmod 700 .secrets
# put a Sepolia private key in .secrets/wallet.key (chmod 600), or set PAYSTILL_WALLET_KEY
npm run wallet          # address and balances
npm run wallet mint     # mint 10 test USDC to the wallet (needs a little Sepolia ETH for gas)
npm run dev
```

Getting Sepolia ETH: use a faucet such as Google Cloud's Web3 faucet, Alchemy, or pk910's PoW faucet. All of them need a login or a captcha, so this step has to be done by a person.

Copy `.env.example` to `.env.local` if you want Postgres (Neon) storage. Without `DATABASE_URL`, data is saved in `data/paystill.json`, which is gitignored.

## Reproduce one paid request

```bash
npm run first-request            # audits https://vercel.com/legal/sla, max $0.05
npm run first-request -- <url>
```

This saves the full request, response, Telegraph receipt and payment response to `evidence/`. The first run during the event is committed at `evidence/first-paid-request-2026-11-01T11-57-54-528Z.json`:

- Settlement: [0x77e8c67d…](https://sepolia.etherscan.io/tx/0x77e8c67d344e5adcc369d54ac43289f3a134c6bc228bfd0cd5c5944bdda20021)

## What the testnet returns right now

As of 1 Nov 2026:

- The plain intents (`CONTRACT_OBLIGATION_AUDIT`, `SLA_COMPLIANCE`) have no miners, so Paystill falls back to the `_GENERAL` variants.
- The miners those variants route to often answer a different question. For example, a terms audit came back with Federal Register agency data, and an SLA check came back with Cloudflare's status page.
- Paystill validates every answer against the intent's schema. It doesn't use answers that fail and labels them "paid, answer unusable" in the memo. If no check is usable, the outcome is "Not enough evidence" instead of a guess.
- If a call fails without being charged, Paystill tries the next intent name. If it was charged, Paystill stops so it never pays twice.

## Reused components

Next.js, React, viem, `@x402/fetch` and `@x402/evm`, `diff`, `@neondatabase/serverless`. The rest was written during Telegraph Hackathon Season II.
