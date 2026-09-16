import { Metadata } from "next"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WaitlistForm from "@modules/home/components/waitlist-form"

export const metadata: Metadata = {
  title: "KeBe",
  // The old site's description ended "Aluminium design". Every KeBe case that
  // exists is 3D printed -- REVISIONS.md proves it from the JLCPCB 3DP order --
  // so that claim is gone and not coming back.
  description:
    "Type in the modern age with the KeBe Matrix-Dvorak layout keyboard. Ortholinear, RGB backlit, hot-swappable, hand-built in Canada.",
  openGraph: {
    title: "KeBe",
    description:
      "Type in the modern age with the KeBe Matrix-Dvorak layout keyboard. Ortholinear, RGB backlit, hot-swappable, hand-built in Canada.",
    images: ["/products/og-image.jpg"],
  },
}

// Only what DESIGN-BRIEF.md actually fixes. No battery life, no weight, no
// date, no price, and no radio module -- V2-SPEC.md and DESIGN-BRIEF.md still
// name different parts, and the board has not been routed.
const V2_SPECS = [
  {
    title: "Wireless, or wired",
    body: "A lithium cell sits under the hot-swap sockets, so the board works untethered and charges over the same port it types through.",
  },
  {
    title: "Four USB-C ports",
    body: "One hosts and charges. The other three are a powered hub on the underside, so the keyboard gives you back the ports the laptop took.",
  },
  {
    title: "The same layout",
    body: "Sixty-eight keys on the same Matrix-Dvorak grid as v1. Nothing you learn on one is wasted on the other.",
  },
  {
    title: "Still yours to change",
    body: "Hot-swap sockets and per-key RGB, on a 12.8 mm stack.",
  },
]

export default async function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-black">
        <Image
          src="/products/kebe-v1-rgb.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-[6vw] py-24 text-center small:px-[4vw]">
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-[#E0E0DB]/70">
            In development
          </p>
          <h1 className="font-display text-[clamp(2.75rem,8vw,4rem)] leading-[1.05] text-white">
            KeBe v2
          </h1>
          <p className="mt-5 max-w-xl font-display text-[clamp(1.25rem,3vw,1.75rem)] text-[#E0E0DB]">
            Mindless Mastery, unplugged
          </p>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#E0E0DB]/80">
            The next KeBe loses the cable and gains a hub. It isn't finished yet
            — leave an address and you'll hear when it is.
          </p>
          <div className="mt-10 flex justify-center">
            <WaitlistForm source="v2" />
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
            v2 is still being designed. Nothing above is a shipping date, and the
            details can still move before the first board is made.
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
