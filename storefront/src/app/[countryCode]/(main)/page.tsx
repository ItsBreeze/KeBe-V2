import { Metadata } from "next"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  PRESALE_HANDLE,
  presaleAvailability,
  presaleShipsBy,
} from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WaitlistForm from "@modules/home/components/waitlist-form"
import ProductModel from "@modules/products/components/product-model"

const DESCRIPTION =
  "KeBe v2: the Matrix-Dvorak ortholinear keyboard with a built-in USB hub. All black and hot-swappable, with per-key RGB through shine-through legends. Assembled by hand in Canada."

export const metadata: Metadata = {
  title: "KeBe",
  // The old site's description ended "Aluminium design". Every KeBe case that
  // exists is 3D printed -- REVISIONS.md proves it from the JLCPCB 3DP order --
  // so that claim is gone and not coming back.
  description: DESCRIPTION,
  openGraph: {
    title: "KeBe",
    description: DESCRIPTION,
    images: ["/products/kebe-v2-og.jpg"],
  },
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

// The case for the layout, one reason each. Check against the caps before
// changing: the Fn arrows are on . O E U, the number pad on the right hand's
// G C R / H T N / M W V / B, F1-F10 on the number row, the media keys in the
// middle columns, and ctrl, alt, fn, the GUI diamond and shift on both sides.
const WHY = [
  {
    title: "Straight columns",
    body: "Keys sit in a grid, not staggered rows. Each finger owns one column and moves straight up and down it: no diagonal reaches to learn, and the same finger always finds the same key.",
  },
  {
    title: "The home row does the work",
    body: "Dvorak puts every vowel under the left hand and the most-used consonants under the right, on the row your fingers rest on. About 70% of English keystrokes land there, against about 30% on QWERTY.",
  },
  {
    title: "Hands take turns",
    body: "With the vowels on one side and the consonants on the other, most words alternate hands: one hand reaches while the other strikes, for a steadier rhythm and less work for any single finger.",
  },
  {
    title: "Both thumbs, both sides",
    body: "Two space bars sit under the thumbs, and Shift, Ctrl, Alt, Fn and the ◆ key are mirrored on each side, so a shortcut takes one key from each hand instead of a stretch with one.",
  },
  {
    title: "Sixty-eight keys, nothing missing",
    body: "Hold Fn and the left hand's home keys become arrows, the right hand's a number pad, and the number row F1 to F10. Media controls sit in the middle columns. Nothing is more than a finger's reach from home.",
  },
  {
    title: "A clean start",
    body: "Nothing sits where a standard keyboard puts it, so you learn KeBe as a new instrument instead of unpicking old habits one key at a time, and every key is somewhere you can work out from the grid.",
  },
]

type Presale =
  | { state: "none" }
  | {
      state: "open" | "sold-out"
      price?: string
      shipsBy: string
      left: number | null
    }

// The homepage must render with the backend down, so any failure reads as
// "no presale yet" and falls back to the waitlist.
async function getPresale(countryCode: string): Promise<Presale> {
  let product: HttpTypes.StoreProduct | undefined
  try {
    const { response } = await listProducts({
      countryCode,
      queryParams: { handle: PRESALE_HANDLE, limit: 1 },
    })
    product = response.products[0]
  } catch {
    return { state: "none" }
  }
  const shipsBy = product && presaleShipsBy(product)
  if (!product || !shipsBy) return { state: "none" }

  const { open, left } = presaleAvailability(product)
  return {
    state: open ? "open" : "sold-out",
    price: getProductPrice({ product }).cheapestPrice?.calculated_price,
    shipsBy,
    left,
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const presale = await getPresale(countryCode)

  return (
    <div className="bg-kebe-page text-kebe-text">
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
                ? "First batch spoken for"
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
                    {presale.left === null
                      ? ""
                      : presale.left === 1
                      ? "1 board left · "
                      : `${presale.left} boards left · `}
                    ships by {presale.shipsBy} · Canada
                  </p>
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
            ? "The first batch has sold out — leave an address and you'll hear when the next one opens."
            : presale.state === "none"
            ? "Leave an address and you'll hear when pre-orders open."
            : "Shipping is calculated at checkout and the board is charged in full there."}
        </p>
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
            The keyboard you learned on kept two habits from the typewriter:
            rows knocked sideways to clear its levers, and a letter order that
            was never arranged around your hands. KeBe drops both.
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
            Switching takes practice, and the first weeks are slower. Once it
            is in your hands you stop thinking about the keyboard at all:
            that is the mindless mastery in the name.
          </p>
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
