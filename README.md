# Paystill

Paystill checks your subscriptions before they renew.

Most of us pay for things we've forgotten about. Prices go up quietly, terms change in an email nobody reads, and a service you pay for every month can be down half the time without you noticing. By the time you check, the money has already gone.

Paystill looks at each recurring charge before it renews and tells you whether it's still worth paying.

## How it works

You connect your list of subscriptions, or just add them by hand. A day or two before each renewal, Paystill checks it and gives you one of three answers:

- **Pay it.** Nothing has changed and the service is working.
- **Cancel it.** You're paying more than you should, or you don't need it any more.
- **Push back.** The service broke its promises, so you're owed a refund or credit.

It always shows you why, along with what each check found.

## What it checks

- Whether the price you're being charged matches the current public price
- Whether the service has actually been up and working
- Whether it has kept the service levels it promised
- Whether the terms have changed since you signed up

If you're owed something, Paystill drafts the refund or credit request for you, with the evidence attached.

## Built on Telegraph

This is my entry for Telegraph Hackathon Season II, in the App / Agent track. Paystill doesn't run its own price trackers or uptime monitors. It buys each check through Telegraph, and Telegraph sends it to whichever provider currently ranks best for that kind of check. Every answer comes back with a receipt showing who checked it, what it cost and how confident they were. That receipt is what makes a refund request hard to argue with.

## Status

The build runs from 1 November to 1 December 2026. I'll update this repo as I go.

## License

MIT
