import { Metadata } from "next"

import { pageAlternates } from "@lib/data/seo"
import { BRAND, socialMetadata } from "@lib/util/seo"
import { getTrainerAccount } from "@lib/data/trainer"
import { itemFrom } from "@lib/train/course"
import Trainer from "@modules/train/components/trainer"

// What people search for a trainer by (Google's suggestions: "dvorak typing
// trainer", "dvorak typing game"), in what the page does: four home-row
// keys, then a key a level, the board coloured by finger, the 10-word test.
// The letters are Dvorak's on any keyboard, so the title says Dvorak.
const TITLE = "Free Dvorak Typing Trainer: Learn One Letter at a Time"
const DESCRIPTION =
  "Learn Dvorak with a free typing game: four home-row keys to start, then one new letter a level, then symbols, numbers and the Fn pad, on a board coloured by finger, with a 10-word speed test."

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
// just the game, with a line under it for anyone typing on another keyboard.
export default async function TrainPage(props: {
  searchParams: Promise<{ mode?: string; at?: string }>
}) {
  const [{ mode, at }, account] = await Promise.all([
    props.searchParams,
    getTrainerAccount().catch(() => null),
  ])

  return (
    <div className="bg-kebe-page text-kebe-text">
      <div className="mx-auto max-w-[1320px] px-[6vw] pb-20 pt-4 small:px-[4vw] small:pt-6">
        <h1 className="sr-only">Learn KeBe&apos;s layout: a typing trainer</h1>
        <Trainer account={account} initial={itemFrom(at, mode)} />
        {/* A note for any keyboard, no shop link: the page is the game (owner, 14 Oct 2026). */}
        <p className="mt-10 max-w-xl text-sm leading-relaxed text-kebe-muted">
          The letters work on any keyboard: press the key in the same place
          as on the board, with no need to set your computer to Dvorak. The
          symbol and Fn levels use keys only KeBe has. On a KeBe, tick
          &ldquo;Typing on a KeBe&rdquo;, and turn autocorrect off with Fn +
          A while you practise: words it fixes don&apos;t count. The board
          above is KeBe v2&apos;s, legends and all.
        </p>
      </div>
    </div>
  )
}
