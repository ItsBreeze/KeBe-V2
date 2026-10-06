import { clx } from "@medusajs/ui"

import { Finger, Hand, Touch } from "@lib/train/layout"

// Both hands as rows of fingers, the left hand over the left half of the
// board and the right over the right, lit for the finger that strikes the
// next key and outlined for one that holds Shift or Fn meanwhile.

const ORDER: Finger[] = ["pinky", "ring", "middle", "pointer", "thumb"]
// Taller where the finger is longer, so each row reads as a hand.
const HEIGHT: Record<Finger, string> = {
  pinky: "h-9",
  ring: "h-11",
  middle: "h-12",
  pointer: "h-11",
  thumb: "h-7",
}

type Props = {
  press: Touch | null
  hold: Touch[]
  className?: string
}

export default function Hands({ press, hold, className }: Props) {
  return (
    <div className={clx("flex items-end justify-between gap-3", className)} aria-hidden>
      {(["left", "right"] as Hand[]).map((hand) => {
        const fingers = hand === "left" ? ORDER : ORDER.slice().reverse()
        return (
          <div
            key={hand}
            className={clx(
              "flex min-w-0 max-w-[20rem] flex-1 flex-col gap-2",
              hand === "right" && "items-end text-right"
            )}
          >
            <div className="flex w-full items-end gap-1 small:gap-1.5">
              {fingers.map((f) => {
                const on = press?.hand === hand && press.finger === f
                const held = hold.some((h) => h.hand === hand && h.finger === f)
                return (
                  <span
                    key={f}
                    className={clx(
                      "flex min-w-0 flex-1 items-end justify-center rounded-b-md rounded-t-full border pb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-100",
                      HEIGHT[f],
                      f === "thumb" && (hand === "left" ? "ml-1 xsmall:ml-3" : "mr-1 xsmall:mr-3"),
                      on
                        ? "border-[#3f9e77] bg-[#3f9e77] text-kebe-page"
                        : held
                        ? "border-[#3f9e77] bg-[#2b5444] text-kebe-text"
                        : "border-kebe-line bg-kebe-raised text-kebe-faint"
                    )}
                  >
                    <span className="hidden xsmall:inline">{f}</span>
                  </span>
                )
              })}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-kebe-muted">
              {hand} hand
            </p>
          </div>
        )
      })}
    </div>
  )
}
