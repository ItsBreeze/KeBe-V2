import { Metadata } from "next"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { pageAlternates, storefrontCountries } from "@lib/data/seo"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  fitSentences,
  productOfferSentence,
  socialMetadata,
} from "@lib/util/seo"
import {
  PRESALE_HANDLE,
  LITE_HANDLE,
  presaleAvailability,
  presaleShipLine,
  presaleShipsBy,
} from "@lib/util/presale"
import { HABITS, WHY } from "@lib/util/kebe-copy"
import { fccNoticeBoards } from "@lib/util/fcc"
import { organizationJsonLd, websiteJsonLd } from "@lib/util/structured-data"
import FccNotice from "@modules/common/components/fcc-notice"
import JsonLd from "@modules/common/components/json-ld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WaitlistForm from "@modules/home/components/waitlist-form"
import ProductModel from "@modules/products/components/product-model"

// What the board is, for a search result: the title used to be just "KeBe".
// The words people search for it by come first (ortholinear, Dvorak, USB
// hub), in at most 60 characters; the product page's title takes the
// low-profile ones, so the two do not compete.
const TITLE = "KeBe v2: Ortholinear Dvorak Keyboard with USB Hub"

// The snippet's opening, in facts this page and the product page state, at
// most 123 characters so this country's price sentence fits in Google's 155.
// The old site's description ended "Aluminium design". Every KeBe case that
// exists is 3D printed -- REVISIONS.md proves it from the JLCPCB 3DP order
// -- so that claim is gone and not coming back.
const LEAD =
  "An ortholinear Dvorak keyboard with a built-in USB hub, Kailh Choc hot-swap and per-key RGB, assembled by hand in Canada."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  // The same request the page makes for its button, so the snippet's price
  // is the button's; without the backend there is no price in it.
  const product = await presaleProduct(countryCode)
  const description = fitSentences([
    LEAD,
    product ? productOfferSentence(product) : null,
  ])
  return {
    title: { absolute: TITLE },
    description,
    alternates: await pageAlternates(countryCode),
    ...socialMetadata({ title: TITLE, description, path: "", countryCode }),
  }
}

// The board the kebe repo calls v3 (PCBs/v3/README.md, Case_Files/v3/README.md):
// v1 plus a CH334F hub. The wireless design, the repo's own v2, is not for
// sale; nothing here may promise a battery or a radio.
const V2_SPECS = [
  {
    title: "Four USB-C ports",
    body: "One goes to your computer. The other three are a USB 2.0 hub inside the board, so the mouse receiver and the flash drive plug into the keyboard instead of the laptop.",
  },
  {
    title: "The same layout",
    body: "Sixty-eight keys on the same Matrix-Dvorak grid as v1. Nothing you learn on one is wasted on the other. Where a key has an Fn-layer legend, it sits below its main one.",
  },
  {
    title: "Lower, and no screws",
    body: "One piece of black nylon, 8.65 mm tall against v1's 9.45, that snaps around the board, switches and black plate.",
  },
  {
    title: "Still yours to change",
    body: "Kailh Choc hot-swap sockets, per-key RGB that lights each legend through the black caps, and QMK on v1's STM32 controller, so a v1 keymap carries straight over.",
  },
]

// The case for the layout, HABITS and WHY, lives in lib/util/kebe-copy.ts:
// the product page quotes it under its button, so a change there shows on
// both pages (6 Oct 2026).

// No count of boards anywhere: the line under the button says only when an
// order placed now ships (owner, 1 Oct 2026).
type Presale =
  | { state: "none" }
  | {
      state: "open" | "sold-out"
      price?: string
      shipLine: string | null
    }

// The presale board in this country, or undefined when the backend cannot
// be read: the homepage must render with it down.
async function presaleProduct(
  countryCode: string,
  handle: string = PRESALE_HANDLE
): Promise<HttpTypes.StoreProduct | undefined> {
  try {
    const { response } = await listProducts({
      countryCode,
      queryParams: { handle, limit: 1 },
    })
    return response.products[0]
  } catch {
    return undefined
  }
}

// Any failure reads as "no presale yet" and falls back to the waitlist.
async function getPresale(countryCode: string): Promise<Presale> {
  const product = await presaleProduct(countryCode)
  if (!product || !presaleShipsBy(product)) return { state: "none" }

  // "sold-out" only once every counted board is sold with backorders off;
  // ship-dates.ts turns them on, so the board normally stays open.
  return {
    state: presaleAvailability(product).open ? "open" : "sold-out",
    price: getProductPrice({ product }).cheapestPrice?.calculated_price,
    shipLine: presaleShipLine(product),
  }
}

// KeBe Lite's price and ship line, said under v2's Pre-order only while the Lite can be pre-ordered: the lower
// price the ads lead with (owner, 6 Oct 2026). Any failure leaves the line out.
async function getLite(countryCode: string) {
  const product = await presaleProduct(countryCode, LITE_HANDLE)
  if (!product || !presaleShipsBy(product) || !presaleAvailability(product).open) {
    return null
  }
  return {
    price: getProductPrice({ product }).cheapestPrice?.calculated_price,
    shipLine: presaleShipLine(product),
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [presale, lite] = await Promise.all([
    getPresale(countryCode),
    getLite(countryCode),
  ])
  // The store's return policy is given for each of these (structured-data.ts).
  const countries = await storefrontCountries()
  // The reel's end card names the price and where it ships: US$249 · US on
  // the US route, CA$349 · Canada everywhere else (the shop's two regions).
  const market = countryCode.toLowerCase() === "us" ? "us" : "ca"

  return (
    <div className="bg-kebe-page text-kebe-text">
      {/* Who sells the board and what the site is called, for search
          engines and AI answers. */}
      <JsonLd data={organizationJsonLd(countries)} />
      <JsonLd data={websiteJsonLd()} />
      {/* Hero: the lit 3D model from v2's CAD (scripts/render-v2) fills it,
          still, with the name and Pre-order laid over its top. A click on
          the model (not the text) hands it the pointer to turn and zoom. */}
      <section className="relative">
        <ProductModel
          src="/products/kebe-v2.glb"
          poster="/products/kebe-v2-glow.jpg"
          alt="KeBe v2, a 3D model with its per-key lighting on."
          eager
          variant="backdrop"
          angle="-25deg 62deg"
          fill={0.72}
          stageClassName="inset-x-0 bottom-0 top-[40%] small:top-[20%]"
          className="h-[calc(100svh-4rem)] min-h-[640px] max-h-[1000px] bg-[radial-gradient(ellipse_at_50%_68%,#2c2821_0%,#1c1a17_38%,#12110f_72%)]"
        >
          <div className="mx-auto flex max-w-[1200px] flex-col items-center px-[6vw] pt-12 text-center small:px-[4vw] small:pt-16">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
              {presale.state === "open"
                ? "Pre-orders open"
                : presale.state === "sold-out"
                ? "Pre-orders closed"
                : "Coming soon"}
            </p>
            <h1 className="font-display text-[clamp(3rem,8vw,5rem)] leading-none">
              KeBe v2
            </h1>
            <p className="mt-4 max-w-xl text-[clamp(1.1rem,2.5vw,1.35rem)] text-kebe-text/80">
              Mindless Mastery, now with a hub
            </p>
            <div className="mt-8 flex flex-col items-center">
              {presale.state === "open" ? (
                <>
                  <LocalizedClientLink
                    href={`/products/${PRESALE_HANDLE}`}
                    className="rounded-xl bg-kebe-text px-8 py-3 text-base font-medium text-kebe-page transition-colors hover:bg-white"
                  >
                    Pre-order{presale.price ? ` — ${presale.price} + shipping` : ""}
                  </LocalizedClientLink>
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-kebe-muted">
                    {presale.shipLine
                      ? `${presale.shipLine} · Canada and the US`
                      : "Ships to Canada and the US"}
                  </p>
                  {lite?.price && (
                    <p className="mt-5 max-w-md text-base text-kebe-text/80">
                      Or KeBe Lite, with backlit rubber-dome keys: {lite.price}{" "}
                      + shipping{lite.shipLine ? `, ${lite.shipLine.toLowerCase()}` : ""}.{" "}
                      <LocalizedClientLink
                        href={`/products/${LITE_HANDLE}`}
                        className="whitespace-nowrap text-kebe-text underline underline-offset-4 hover:text-white"
                      >
                        See KeBe Lite
                      </LocalizedClientLink>
                    </p>
                  )}
                </>
              ) : (
                <WaitlistForm source="v2" />
              )}
            </div>
          </div>
        </ProductModel>
      </section>

      <section className="mx-auto max-w-[1200px] px-[6vw] py-16 text-center small:px-[4vw]">
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-kebe-text/80">
          The v1 layout, all in black, in a lower, screwless case, with three
          more USB-C ports on the back.{" "}
          {presale.state === "sold-out"
            ? "Pre-orders are closed for now — leave an address and you'll hear when they open again."
            : presale.state === "none"
            ? "Leave an address and you'll hear when pre-orders open."
            : "Shipping is calculated at checkout and the board is charged in full there."}
        </p>
        {/* The hero offers KeBe v2, and KeBe Lite under it, at their US
            prices, so /us gives the product pages' FCC notice here too for
            each one it offers whose SDoC is pending (lib/util/fcc.ts,
            7 Oct 2026). */}
        {presale.state === "open" && (
          <FccNotice
            boards={fccNoticeBoards(countryCode, [
              PRESALE_HANDLE,
              lite?.price ? LITE_HANDLE : null,
            ])}
            className="mx-auto mt-6 max-w-xl rounded-xl border border-kebe-line bg-kebe-raised p-4 text-left text-base leading-relaxed text-kebe-text/80"
          />
        )}
      </section>

      {/* What v2 is */}
      <section className="border-t border-kebe-line py-24">
        <div className="mx-auto max-w-[1200px] px-[6vw] small:px-[4vw]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
            What changes
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">
            v1&apos;s board, with a hub built in
          </h2>
          {/* An AI camera move over the night scene, with the CAD keyboard
              tracked back into every frame (scripts/render-v2). */}
          <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-kebe-line">
            <Image
              src="/products/kebe-v2-night-clip.jpg"
              alt="KeBe v2 on a desk at night, its legends lit in a rainbow by the per-key RGB."
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
            <video
              aria-hidden
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/products/kebe-v2-night-clip.jpg"
              className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
            >
              <source media="(prefers-reduced-motion: no-preference)" src="/products/kebe-v2-night-clip.webm" type="video/webm" />
              <source media="(prefers-reduced-motion: no-preference)" src="/products/kebe-v2-night-clip.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="mt-14 grid gap-x-12 gap-y-12 small:grid-cols-2">
            {V2_SPECS.map((s) => (
              <div key={s.title} className="border-t border-kebe-line pt-6">
                <h3 className="font-display text-[clamp(1.5rem,3vw,2rem)]">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-kebe-text/75">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-14 max-w-2xl text-sm leading-relaxed text-kebe-faint">
            v2 is wired: the battery-and-Bluetooth design is not for sale, and
            this is the board that ships. None of the v2 pictures or videos are
            photographs. The 3D model at the top and the plain renders come
            straight from its CAD; the desk, studio and night scenes, the clip
            above included, set that CAD model in AI-generated surroundings.
          </p>
        </div>
      </section>

      {/* Why the layout. Every claim is checkable on the caps themselves
          (the Fn legends in Keycaps/print) or is the textbook description of
          Dvorak; the home-row shares are the usual English-text figures. */}
      <section className="border-t border-kebe-line bg-kebe-raised py-24">
        <div className="mx-auto max-w-[1200px] px-[6vw] small:px-[4vw]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
            Peace of mind · speed of thought
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">
            Why make the change?
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-kebe-text/80">
            The keyboard you learned on was designed around a typewriter. Two
            of its habits survive on every laptop, and neither has a reason to
            any more.
          </p>
          {/* The reel (marketing/instagram/kebe-reel-levers.mp4, owner's
              voice, captions burnt in) makes the whole case in 48 seconds,
              drawn in KeBe's own keys; the text below it goes further. The
              end card names the price, the ship line and the market, so each
              market gets its own cut, and whoever changes the presale price
              or ships_by must re-render the end card for both markets
              (build.mjs --from=<end0>, then --market=us) and re-copy all four
              files here. No autoplay: it has a voice. */}
          <div className="mt-10 grid gap-8 small:grid-cols-[minmax(0,360px)_1fr] small:items-center">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-2xl border border-kebe-line bg-black small:mx-0">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/products/kebe-v2-reel.jpg"
                aria-label="Why KeBe is laid out the way it is, in 48 seconds"
                className="h-full w-full object-cover"
              >
                <source src={`/products/kebe-v2-reel-${market}.webm`} type="video/webm" />
                <source src={`/products/kebe-v2-reel-${market}.mp4`} type="video/mp4" />
              </video>
            </div>
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
                Watch, 48 seconds
              </p>
              <p className="mt-3 font-display text-[clamp(1.35rem,2.5vw,1.75rem)] leading-snug">
                The whole argument, drawn in KeBe&apos;s own keys.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-kebe-text/75">
                Or read on: the words below have the history, the rest of the
                layout and the reason behind every move.
              </p>
            </div>
          </div>
          <div className="mt-14 grid gap-6 small:grid-cols-2">
            {HABITS.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-kebe-line bg-kebe-page p-8"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
                  {h.label}
                </p>
                <h3 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)]">
                  {h.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-kebe-text/75">
                  {h.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl font-display text-[clamp(1.35rem,2.5vw,1.75rem)] leading-snug">
            Nothing on a digital keyboard can jam. Keeping either habit only
            costs your hands.
          </p>
          <div className="relative mt-12 aspect-[2/1] w-full overflow-hidden rounded-2xl border border-kebe-line">
            <Image
              src="/products/kebe-v2-top.jpg"
              alt="KeBe v2 from above: 68 keys in straight columns, the Dvorak letters in the middle, the modifiers mirrored on both sides."
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
          </div>
          <ol className="mt-14 grid gap-x-12 gap-y-12 small:grid-cols-2">
            {WHY.map((w, i) => (
              <li key={w.title} className="border-t border-kebe-line pt-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)]">
                  {w.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-kebe-text/75">
                  {w.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-14 max-w-2xl text-lg leading-relaxed text-kebe-text/80">
            Nothing sits where a standard keyboard puts it, so you learn KeBe
            as a new instrument instead of unpicking old habits one key at a
            time. Switching takes practice, and the first weeks are slower.
            Once it is in your hands you stop thinking about the keyboard at
            all: that is the mindless mastery in the name.
          </p>
          {/* The practice the paragraph above promises: the typing trainer
              teaches the layout a few keys at a time, before the board arrives. */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LocalizedClientLink
              href="/train"
              className="rounded-xl bg-kebe-text px-6 py-3 text-base font-medium text-kebe-page transition-colors hover:bg-white"
            >
              Start learning the layout
            </LocalizedClientLink>
            <p className="text-base text-kebe-text/60">
              A free typing game, one letter at a time.
            </p>
          </div>
        </div>
      </section>

      {/* v1 */}
      <section className="border-t border-kebe-line py-16">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-[6vw] small:flex-row small:items-center small:px-[4vw]">
          <div>
            <h2 className="font-display text-3xl">KeBe v1</h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-kebe-text/70">
              The board that started it. Sixty-eight keys, wired, hand-built in
              small batches — and sold out.
            </p>
          </div>
          <LocalizedClientLink
            href="/products/kebe-v1-keyboard"
            className="rounded-xl border border-kebe-line px-6 py-3 text-base transition-colors hover:border-kebe-muted"
          >
            See the v1
          </LocalizedClientLink>
        </div>
      </section>
    </div>
  )
}
