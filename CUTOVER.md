# Cut-over: KeBe -> Brisebois' Boards

Run this only after Josh says go through Lute. The recommended day is Mon 2 Nov 2026. Before that day this branch (`rebrand`) stays unmerged. Do the steps in order. "Josh" means the step needs Josh himself: money, DNS, a new account or his login.

## 0. Before the day
- [ ] Artie's wordmark is final. If it replaces the text wordmark in the header and footer, it lands on this branch first.
- [ ] Mark has QA'd the renamed renders (marketing/brand/brisebois-boards/renders/MANIFEST.md) and captions.
- [ ] Lute has confirmed the new IG handle is free in the app (first pick @brisebois.boards, fallback @briseboisboards).

## 1. Merge order
1. If `taxes-included` (b7bf41f, "Canadian prices say taxes included") is still unmerged, merge it into `main` **first**, the same way any store change goes in. It merges cleanly into `rebrand` (checked with `git merge-tree`, 26 Oct). Merging it first means the tax-inclusive CA$349 wording ships either way, and this branch never has to carry it.
2. Update this branch from `main` (`git merge origin/main` on `rebrand`), build, and check nothing says KeBe:
   `grep -rn "KeBe" storefront/src --include=*.tsx --include=*.ts | grep -v "//"` should show only code comments and identifiers.
3. Merge `rebrand` into `main`.

## 2. Instagram link in code (same day, before deploying)
The rename frees the old handle, so instagram.com/kebe_keyboards stops being ours the moment the rename happens. On `main`, change all three to the new handle, then commit:
- `storefront/src/lib/util/seo.ts`: `INSTAGRAM_URL`
- `storefront/src/modules/layout/templates/footer/index.tsx`: `INSTAGRAM_HANDLES[0]`
- `storefront/src/app/llms.txt/route.ts`: the `Instagram @kebe_keyboards` link text

## 3. Product data (live database)
From `backend/`, with the new code deployed to `medusa-backend` (step 4) or run through `railway ssh` as the other scripts are:
```
railway ssh --service medusa-backend -- sh -c "cd /app && ./node_modules/.bin/medusa exec ./src/scripts/rebrand-names.ts"
```
- Renames titles: KeBe v2 / v1 -> Breeze Board, KeBe Lite -> Breeze Board Lite. Writes the renamed Breeze Board, Lite and gift card descriptions. Handles, SKUs and prices are unchanged.
- Safe to re-run. It logs every row it changes. The v1 case set and PCB are drafts: their titles are renamed, their descriptions are not (they are never shown).
- Afterwards, check the store API: `/store/products?fields=handle,title`.
- Price list names ("KeBe v2 pre-order", "KeBe Lite pre-order") stay as they are. The scripts find the lists by those names, and the site never shows them.

## 4. Deploy
From the box, as usual (no Git-connected Railway service, no preview environment):
```
cd backend && railway up --service medusa-backend
cd storefront && railway up --service storefront
```
The storefront must be rebuilt, not restarted. Then revalidate, or wait for the cache, so product pages pick up the new titles.

Optional, low stakes: `cd workers/order-mail && wrangler deploy` changes only the sender name on the shop's own order emails ("Brisebois' Boards orders").

## 5. Instagram (Lute, in the app)
1. Rename @kebe_keyboards to the new handle. Update the name, the bio and the link in bio.
2. **Josh:** right after that, register @kebe_keyboards as a parked account with one line: "We're now @<new handle>" plus the store link. This is a new account, so it needs Josh.
3. Switch the scheduled posts to the renamed renders (renders/MANIFEST.md). Post the single "we're now Brisebois' Boards" announcement first.

## 6. Domain boards.brisebois.xyz (Josh, later, optional the same day)
Not part of this branch. The store stays on kebe.brisebois.xyz until this step is done.
1. **Josh:** in Cloudflare, add the DNS record for `boards.brisebois.xyz` pointing at the `storefront` Railway service, and add the custom domain on that service in Railway.
2. Then a code change:
   - `NEXT_PUBLIC_BASE_URL` = `https://boards.brisebois.xyz` on `storefront`.
   - `STOREFRONT_URL` on `medusa-backend`.
   - `STORE_CORS` and `AUTH_CORS`.
   - In `storefront/next.config.js`, a host redirect `kebe.brisebois.xyz -> boards.brisebois.xyz` (308, path kept), alongside the existing kebe.grounders.app one, and point that one at the new host too.
   - `PIXEL_HOSTS` in `meta-pixel/index.tsx`.
   - The waitlist footer text in `app/waitlist/page-html.ts`.
   - Re-register the Stripe webhook only if the backend URL changes (it does not: it is the Railway domain).
3. Re-render the end cards that print kebe.brisebois.xyz (renders/MANIFEST.md lists them).
4. Update the Merchant Center / Meta catalog feed URLs and the ads' destination URLs (**Josh**: ads).

## 7. After
- [ ] Spot-check /ca, /us, both product pages, cart and checkout, /llms.txt, /feeds and /sitemap.xml for "KeBe".
- [ ] Place no test order on live. If one is needed, that is Josh's call.
- [ ] Listings copy (marketing/listings/*.md), ads copy and packaging get renamed separately (see REBRAND-PLAN.md).
