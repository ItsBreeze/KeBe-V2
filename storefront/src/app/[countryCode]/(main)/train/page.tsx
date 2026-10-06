import { Metadata } from "next"

import { pageAlternates } from "@lib/data/seo"
import { BRAND, socialMetadata } from "@lib/util/seo"
import { getTrainerAccount } from "@lib/data/trainer"
import { PRESALE_HANDLE } from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Trainer from "@modules/train/components/trainer"

// What people search for a trainer by (Google's suggestions: "dvorak typing
// trainer", "dvorak typing game"), in what the page does: four home-row
// keys, then a key a level, the board coloured by finger, the 10-word test.
// The letters are Dvorak's on any keyboard, so the title says Dvorak.
const TITLE = "Free Dvorak Typing Trainer: Learn One Key at a Time"
const DESCRIPTION =
  "Learn Dvorak with a free typing game: four home-row keys to start, then one new key a level, a board coloured by finger and a 10-word speed test."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    // The root layout's template adds " | KeBe".
    title: TITLE,
    description: DESCRIPTION,
    alternates: await pageAlternates(countryCode, "/train"),
    // The board the trainer draws, from above: a CAD render.
    ...socialMetadata({
      title: `${TITLE} | ${BRAND}`,
      description: DESCRIPTION,
      path: "/train",
      countryCode,
      images: [
        {
          url: "/products/kebe-v2-top.jpg",
          width: 2400,
          height: 1800,
          alt: "KeBe v2 from above, rendered from its CAD: 68 keys in straight columns, the Dvorak letters in the middle.",
        },
      ],
    }),
  }
}

// The trainer is the page: no introduction above it (owner, 5 Oct 2026),
// just the game, with a line under it for anyone typing on another keyboard
// and a way back to the board it teaches.
export default async function TrainPage(props: {
  searchParams: Promise<{ mode?: string }>
}) {
  const [{ mode }, account] = await Promise.all([
    props.searchParams,
    getTrainerAccount().catch(() => null),
  ])

  return (
    <div className="bg-kebe-page text-kebe-text">
      <div className="mx-auto max-w-[1100px] px-[6vw] pb-20 pt-4 small:px-[4vw] small:pt-6">
        <h1 className="sr-only">Learn KeBe&apos;s layout: a typing trainer</h1>
        <Trainer
          account={account}
          initialMode={mode === "test" ? "test" : "levels"}
        />
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-kebe-line pt-8 text-sm text-kebe-muted small:flex-row small:items-center">
          <p className="max-w-xl leading-relaxed">
            It reads the letters your computer receives, so it works on a KeBe,
            or on any keyboard with your computer set to Dvorak. The board
            above is KeBe v2&apos;s, legends and all.
          </p>
          <LocalizedClientLink
            href={`/products/${PRESALE_HANDLE}`}
            className="shrink-0 rounded-xl border border-kebe-line px-5 py-2.5 text-base text-kebe-text transition-colors hover:border-kebe-muted"
          >
            See KeBe v2
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}
