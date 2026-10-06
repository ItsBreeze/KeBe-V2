import { Metadata } from "next"

import { pageAlternates } from "@lib/data/seo"
import { getTrainerAccount } from "@lib/data/trainer"
import { PRESALE_HANDLE } from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Trainer from "@modules/train/components/trainer"

const DESCRIPTION =
  "Learn KeBe's Matrix-Dvorak layout one key at a time: whole words from the thousand most common, a target speed to open the next level, and a 10-word speed test for your top score."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    title: "Learn the Matrix-Dvorak layout: a free typing trainer",
    description: DESCRIPTION,
    alternates: await pageAlternates(countryCode, "/train"),
    openGraph: {
      title: "Learn KeBe's layout",
      description: DESCRIPTION,
      images: ["/products/kebe-v2-top.jpg"],
    },
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
