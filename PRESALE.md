# KeBe v2 presale — linking Stripe and opening it

KeBe v2 is the board the `kebe` repo calls v3: v1 plus a USB 2.0 hub and three
more USB-C ports, in a screwless case, sold all black: MJF PA12 case dyed black,
black-soldermask FR4 plate, black caps with shine-through legends (Fn legend
below the main one). CA$349 plus shipping while pre-orders are open (CA$299 from 30 Sept to 2 Oct 2026; back to CA$349 on 2 Oct to cover the keycap laser engraving), both
charged in full at checkout, then CA$386.89 once pre-orders close. The first 5
boards ship by 31 October 2026; boards ordered after them are backorders that
ship by 30 November 2026 (see **Ship dates** below). Say "plus shipping"
wherever the price appears, ads included, and only while shipping really is
calculated per order: a flat fee every buyer pays belongs in the advertised
price. The wireless design is not this product.

Never say how many boards there are or are left (owner, 1 Oct 2026): not on the
site, not in the product description, not in an ad or a post. Say when an order
placed now ships instead.

The presale cannot open until Stripe takes the money: `start-presale.ts` refuses
to run otherwise. Do the steps in order.

## 1. Put each Stripe key on the right service

Stripe Dashboard → **Developers → API keys**, in **live** mode (toggle off
"Test mode").

| Railway service | Variable | Value |
|---|---|---|
| `medusa-backend` | `STRIPE_SECRET_KEY` | the **secret** key, `sk_live_…` |
| `storefront` | `NEXT_PUBLIC_STRIPE_KEY` | the **publishable** key, `pk_live_…` |

The secret key must **not** be on `storefront`. Anything on the storefront named
`NEXT_PUBLIC_…` is built into the JavaScript every visitor downloads. If an
`sk_live_…` was ever saved there and the storefront was deployed, **roll the key**
in Stripe (API keys → ⋯ → Roll key) and use the new one on `medusa-backend`.

While you are in `medusa-backend`'s variables, check that `STOREFRONT_URL`
(`https://kebe.grounders.app`) and `REVALIDATE_SECRET` (the same value as on
`storefront`) are set. They are what moves the site's date from `ships_by` to
`ships_by_next` after the fifth order. Also check `MEDUSA_BACKEND_URL` there: the backend's own public https
address, the one the storefront's `MEDUSA_BACKEND_URL` points at. The webhook
script in step 2 registers `<that>/hooks/payment/stripe_stripe` (it falls back to
the service's Railway public domain if it has one).

Redeploy both services. The storefront has to be rebuilt, not just restarted:
`NEXT_PUBLIC_` values are fixed at build time.

## 2. Register the webhook

From `backend/` (linked to the kebe-v2 Railway project):

```
railway run --service medusa-backend node scripts/stripe-webhook.js
```

It creates the Stripe webhook and saves `STRIPE_WEBHOOK_SECRET` on
`medusa-backend` without printing it. Redeploy `medusa-backend` once more so it
reads that secret.

## 3. Make Stripe the only way to pay, then open the presale

Against the production database, the same way `seed-kebe.ts` was run:

```
npx medusa exec ./src/scripts/use-stripe.ts
npx medusa exec ./src/scripts/start-presale.ts
```

`start-presale.ts` checks that the key is live, the webhook secret is set and
Canada pays through Stripe alone, then publishes `kebe-v2-keyboard` at CA$386.89
with 5 in stock. Re-running it is safe: it refreshes the description, pictures
and 3D model, keeps a `ships_by` date you set in Admin, and never changes price
or existing stock (it sets the first 5 only if stock was never set). The title,
colour and SKU are fixed when the product is first created; change those in
Admin.

It revalidates the storefront itself when it finishes. If it warns that it
could not (it needs `STOREFRONT_URL` and `REVALIDATE_SECRET` where it runs), do
it by hand:

```
curl -X POST "https://kebe.grounders.app/api/revalidate?secret=$REVALIDATE_SECRET"
```

Then put it on its pre-order price:

```
npx medusa exec ./src/scripts/preorder-sale.ts
```

That adds an active **sale** price list, "KeBe v2 pre-order", at CA$349 over the
variant's own CA$386.89, and lists any orders already placed with the price each
paid (refund the difference to anyone who paid more). The site calls CA$349 the
pre-order price and does not say what the price will be after pre-orders close
(owner, 30 Sept 2026: nor should the ad or any post). It never strikes
CA$386.89 through as a former price or shows a percentage off: nobody has bought
the board at CA$386.89, so a "was" price would be a false ordinary-price claim
under the Competition Act.

Then set the ship dates and keep the board on sale past the first five:

```
npx medusa exec ./src/scripts/ship-dates.ts
```

## Ship dates

The site states no quantity anywhere. It says when an order placed now ships,
from two dates in the product's metadata:

| While | The site says | From |
|---|---|---|
| counted boards are unsold (the variant's available stock is above 0) | "Currently shipping October 31, 2026" | `ships_by` |
| they are all sold | "Ships November 30, 2026" | `ships_by_next` |

The line is on the homepage under the Pre-order button, at the top of the buy
box, under the product page's Pre-order button and in its Shipping section. It
flips by itself: the order that takes the last counted board revalidates the
storefront (the `revalidate-storefront` subscriber, on `order.placed`). If
`ships_by_next` is missing or not a real date once the stock is gone, the site
shows no date ("Ships within Canada") rather than invent one.

`ship-dates.ts` turns on **Allow backorders** for `KEBE-V2-BLK-SHINE` (Manage
inventory stays on, so the first 5 are still counted), sets `ships_by_next` to
2026-11-30 unless Admin already holds a real date there, and writes the
description without a count. Re-running it is safe; it never changes price,
stock or `ships_by`. With backorders on, the board never shows Sold Out or the
waitlist: it stays on Pre-order with the second date. In production, after the
backend is deployed with the script:

```
railway ssh --service medusa-backend -- sh -c "cd /app && ./node_modules/.bin/medusa exec ./src/scripts/ship-dates.ts"
```

**Every order after the first 5 is a backorder: a board you still have to
build, promised by the `ships_by_next` the site showed when it was placed.**
The script's log says how many orders are backorders right now (reserved beyond
stocked: the newest unshipped orders). In Admin → Orders they are the orders
placed after the fifth, not counting cancelled ones.

Neither date moves on its own, and the site does not hide a date that has
passed. Move `ships_by` once October 31 has gone by if counted boards are still
unsold, and `ships_by_next` before November 30 if backorders cannot make it.
Changing `ships_by_next` changes only what new buyers see; earlier backorders
keep the date they were shown. Someone who opened the page before the last
counted board sold still sees "Currently shipping October 31, 2026" until they
reload, so check the date of the order that took that board against the
orders right after it.

## 4. Check it

* `https://kebe.grounders.app` shows **Pre-orders open**, "Currently shipping
  October 31, 2026" and CA$349 on the Pre-order button, and no count of boards
  anywhere: homepage, product page, product description.
* Buy one with your own card. The order appears in Admin and the payment in
  Stripe as **Succeeded**. Refund it in Stripe and cancel the order in Admin:
  cancelling releases the reserved board.

## After

* **More boards in hand:** Admin → Inventory → `KEBE-V2-BLK-SHINE` → raise the
  stocked quantity. While those are unsold the site says "Currently shipping"
  `ships_by` again, so set `ships_by` to when they ship.
* **Stopping sales:** Admin → Products → KeBe v2 → the variant → turn off
  Allow backorders. Once the counted boards are gone the homepage says
  **Pre-orders closed** and shows the waitlist; those sign-ups (source `v2`) are
  the demand for the next order. `ship-dates.ts` turns backorders back on, so
  don't re-run it until you want sales open again.
* **Ending the pre-order price:** Admin → Price Lists → KeBe v2 pre-order →
  set it to Draft (or delete it). The site goes back to CA$386.89 with no
  deploy; revalidate it or wait for the cache. Change the ad and any post that
  says CA$349 the same day.
* **Moving a date:** Admin → Products → KeBe v2 → Metadata → `ships_by` or
  `ships_by_next` (`YYYY-MM-DD`). The site follows without a deploy: saving the
  product revalidates it. An invalid `ships_by` takes the board off pre-order
  altogether; an invalid `ships_by_next` only hides the date once the counted
  boards are sold.
