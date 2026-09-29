import { Metadata } from "next"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import { PRESALE_HANDLE, presaleShipsBy, unitsLeft } from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WaitlistForm from "@modules/home/components/waitlist-form"

const DESCRIPTION =
  "Pre-order KeBe v2: the Matrix-Dvorak ortholinear keyboard with a built-in USB hub. Hot-swappable, RGB backlit, hand-built in Canada."

export const metadata: Metadata = {
  title: "KeBe",
  // The old site's description ended "Aluminium design". Every KeBe case that
  // exists is 3D printed -- REVISIONS.md proves it from the JLCPCB 3DP order --
  // so that claim is gone and not coming back.
  description: DESCRIPTION,
  openGraph: {
    title: "KeBe",
    description: DESCRIPTION,
    images: ["/products/og-image.jpg"],
  },
}

// The board the kebe repo calls v3 (PCBs/v3/README.md, Case_Files/v3/README.md):
// v1 plus a CH334F hub. The wireless design, the repo's own v2, stays a
// prototype; nothing here may promise a battery or a radio.
const V2_SPECS = [
  {
    title: "Four USB-C ports",
    body: "One goes to your computer. The other three are a USB 2.0 hub inside the board, so the mouse receiver and the flash drive plug into the keyboard instead of the laptop.",
  },
  {
    title: "The same layout",
    body: "Sixty-eight keys on the same Matrix-Dvorak grid as v1. Nothing you learn on one is wasted on the other.",
  },
  {
    title: "Lower, and no screws",
    body: "One piece of white nylon, 8.65 mm tall against v1's 9.45, that snaps around the board, switches and plate.",
  },
  {
    title: "Still yours to change",
    body: "Kailh Choc hot-swap sockets, per-key RGB, and QMK on v1's STM32 controller, so a v1 keymap carries straight over.",
  },
]

type Presale =
  | { state: "none" }
  | { state: "open" | "sold-out"; price?: string; shipsBy: string; left: number }

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

  const left = unitsLeft(product)
  return {
    state: left > 0 ? "open" : "sold-out",
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
    <>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-black">
        <Image
          src="/products/kebe-v2-glow.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-[6vw] py-24 text-center small:px-[4vw]">
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-[#E0E0DB]/70">
            {presale.state === "open"
              ? "Pre-orders open"
              : presale.state === "sold-out"
              ? "First batch spoken for"
              : "Coming soon"}
          </p>
          <h1 className="font-display text-[clamp(2.75rem,8vw,4rem)] leading-[1.05] text-white">
            KeBe v2
          </h1>
          <p className="mt-5 max-w-xl font-display text-[clamp(1.25rem,3vw,1.75rem)] text-[#E0E0DB]">
            Mindless Mastery, now with a hub
          </p>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#E0E0DB]/80">
            The v1 layout in a lower, screwless case, with three more USB-C
            ports on the back.{" "}
            {presale.state === "open"
              ? `The first batch ships by ${presale.shipsBy}.`
              : presale.state === "sold-out"
              ? "The first batch has sold out — leave an address and you'll hear when the next one opens."
              : "Leave an address and you'll hear when pre-orders open."}
          </p>
          <div className="mt-10 flex flex-col items-center">
            {presale.state === "open" ? (
              <>
                <LocalizedClientLink
                  href={`/products/${PRESALE_HANDLE}`}
                  className="rounded-[7px] bg-white px-8 py-3 text-base text-black transition-opacity hover:opacity-80"
                >
                  Pre-order{presale.price ? ` — ${presale.price}` : ""}
                </LocalizedClientLink>
                <p className="mt-4 text-sm text-[#E0E0DB]/60">
                  {presale.left === 1
                    ? "1 board left"
                    : `${presale.left} boards left`}{" "}
                  · charged in full at checkout · ships within Canada
                </p>
              </>
            ) : (
              <WaitlistForm source="v2" />
            )}
          </div>
        </div>
      </section>

      {/* What v2 is */}
      <section className="bg-[#151915] py-24">
        <div className="mx-auto max-w-[1200px] px-[6vw] small:px-[4vw]">
          <h2 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-white">
            What changes
          </h2>
          <div className="mt-14 grid gap-x-12 gap-y-12 small:grid-cols-2">
            {V2_SPECS.map((s) => (
              <div key={s.title}>
                <h3 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-white">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-[#E0E0DB]/80">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-14 max-w-2xl text-base leading-relaxed text-[#E0E0DB]/50">
            v2 is wired: the battery-and-Bluetooth design is still a prototype,
            and this is the board that ships. The v2 pictures are renders of
            its CAD; the photos below are of v1, whose layout and form v2 keeps.
          </p>
        </div>
      </section>

      {/* Why the layout -- verbatim from the original site, including its own
          spelling and punctuation. */}
      <section className="bg-[#12261E] py-24">
        <div className="mx-auto max-w-[1200px] px-[6vw] small:px-[4vw]">
          <h2 className="text-center font-display text-[clamp(2rem,5vw,2.8rem)] text-white">
            Why Make the Change?
          </h2>
          <div className="mt-16 grid gap-x-16 gap-y-14 small:grid-cols-2">
            <div className="text-center">
              <div className="relative mx-auto mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-sm">
                <Image
                  src="/products/kebe-v1-hero.jpg"
                  alt="A KeBe keyboard seen straight on, its 68 keycaps laid out on a regular grid."
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
              <h3 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-white">
                Peace of Mind
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[#E0E0DB]/85">
                The layout makes it easier to learn to touch type by simplifying
                the matrix and placing keys in logical, locateable locations.
              </p>
            </div>
            <div className="text-center">
              <div className="relative mx-auto mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-sm">
                <Image
                  src="/products/kebe-v1-angle.jpg"
                  alt="A KeBe keyboard at an angle with its per-key RGB lighting on."
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
              <h3 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] text-white">
                Speed of Thought
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[#E0E0DB]/85">
                A matrix organization of keys provides the shortest possible
                distance between keys. This efficiency means, faster stroking
                with less movement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* v1 */}
      <section className="bg-[#151915] py-24">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-[6vw] text-center small:px-[4vw]">
          <h2 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-white">
            KeBe v1
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#E0E0DB]/80">
            The board that started it. Sixty-eight keys, wired, hand-built in
            small batches — and currently out of stock.
          </p>
          <LocalizedClientLink
            href="/products/kebe-v1-keyboard"
            className="mt-9 rounded-[6px] border-2 border-white px-8 py-3 text-base text-white transition-colors hover:bg-white hover:text-black"
          >
            See the v1
          </LocalizedClientLink>
        </div>
      </section>
    </>
  )
}
