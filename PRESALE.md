# KeBe v2 presale — linking Stripe and opening it

KeBe v2 is the board the `kebe` repo calls v3: v1 plus a USB 2.0 hub and three
more USB-C ports, in a screwless case, sold all black: MJF PA12 case dyed black,
black-soldermask FR4 plate, black caps with shine-through legends (Fn legend
below the main one). CA$386.89 plus shipping, both charged in full at checkout,
first batch of 5, ships by 31 October 2026. Say "plus shipping" wherever the
price appears, ads included, and only while shipping really is calculated per
order: a flat fee every buyer pays belongs in the advertised price.
The wireless design is not this product.

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
`storefront`) are set. They are what flips the site to Sold Out after the fifth
order. Also check `MEDUSA_BACKEND_URL` there: the backend's own public https
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

## 4. Check it

* `https://kebe.grounders.app` shows **Pre-orders open** and "5 boards left".
* Buy one with your own card. The order appears in Admin and the payment in
  Stripe as **Succeeded**. Refund it in Stripe and cancel the order in Admin:
  cancelling releases the reserved board.

## After

* **More boards:** Admin → Inventory → `KEBE-V2-BLK-SHINE` → raise the stocked
  quantity. When the batch sells out the homepage switches to the waitlist, and
  those sign-ups (source `v2`) are the demand for the next order.
* **Moving the date:** Admin → Products → KeBe v2 → Metadata → `ships_by`
  (`YYYY-MM-DD`). The button note and the homepage follow it without a deploy.
