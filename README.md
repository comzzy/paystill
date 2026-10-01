# Paystill

Paystill checks a deal before you pay or ship.

If you've ever bought something from a stranger online, you know the feeling. The price looks good, the seller seems friendly, and then they ask you to send the money first. Sellers deal with the same thing from the other side: a buyer sends a screenshot that says "paid", and you're not sure if it's real.

Paystill is for that moment.

## How it works

You give Paystill whatever you have: a seller's profile, a product listing, a photo, a payment request or a payment receipt. It runs a few checks and tells you one of three things:

- **Looks safe**
- **Be careful**
- **Don't go ahead**

It always tells you *why*, so you're not just trusting a score.

It works for both sides of a deal:

- **Buyers** can check whether a seller or listing is real before paying.
- **Sellers** can check whether a payment receipt or a buyer's claim is real before sending anything.

## What it checks

- Whether the account, phone number or bank details have been linked to scams before
- Whether product photos were taken from somewhere else
- Whether a receipt or payment screenshot has been edited
- Whether the price is far below what the item normally sells for
- What your options are if you've already been scammed, including a ready-to-send complaint

## Built on Telegraph

Paystill is my entry for Telegraph Hackathon Season II, in the App / Agent track. Paystill doesn't build its own fraud, image or pricing models. Instead, it buys each check from the best-ranked provider on Telegraph. When a better provider moves up the rankings, Paystill starts using it, so the checks keep getting better without me having to rebuild anything.

## Status

The build runs from 1 November to 1 December 2026. I'll update this repo as I go.

## License

MIT
