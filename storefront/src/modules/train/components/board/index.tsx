import { KEYS, Stroke } from "@lib/train/layout"

// KeBe drawn to scale: 16.5 mm caps on the 18 x 17 mm grid, each carrying
// its printed legends (public/train/caps.svg, the laser's own art), lit the
// way the real caps are: the legend glows, the cap stays black.
//
// learned: keys the level has already taught. adds: the keys it introduces.
// next: what to press now. flash: the key just pressed, and whether it was
// right.

const CAP = 16.5
const PITCH_X = 18
const PITCH_Y = 17

const INK = {
  off: "#3b3732",
  learned: "#9b948a",
  adds: "#f5f1ea",
  lit: "#ffffff",
}
const FILL = {
  cap: "#1c1a17",
  off: "#161412",
  next: "#3f9e77",
  hold: "#2b5444",
  wrong: "#7a2b25",
  pressed: "#2c2924",
}

type Props = {
  learned: Set<string>
  adds: Set<string>
  next: Stroke | null
  flash: { keys: string[]; ok: boolean } | null
  className?: string
}

export default function Board({ learned, adds, next, flash, className }: Props) {
  const nextKeys = new Set(next?.keys ?? [])
  const holdKeys = new Set(next?.hold ?? [])
  const flashKeys = new Set(flash?.keys ?? [])
  const w = 13 * PITCH_X + CAP
  const h = 4 * PITCH_Y + CAP
  const pad = 3

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
      className={className}
      role="img"
      aria-label={
        next
          ? `KeBe's keys, with ${next.name} lit as the next key to press`
          : "KeBe's keys"
      }
    >
      <rect
        x={-pad}
        y={-pad}
        width={w + 2 * pad}
        height={h + 2 * pad}
        rx={4}
        fill="#0d0c0b"
        stroke="#2e2b26"
        strokeWidth={0.4}
      />
      {KEYS.map((k) => {
        const x = k.col * PITCH_X
        const y = k.row * PITCH_Y
        const width = k.w === 2 ? PITCH_X + CAP : CAP
        const isNext = nextKeys.has(k.id)
        const isHold = holdKeys.has(k.id)
        const isFlash = flashKeys.has(k.id)
        const known = learned.has(k.id) || adds.has(k.id)

        let fill = known ? FILL.cap : FILL.off
        let ink = adds.has(k.id) ? INK.adds : known ? INK.learned : INK.off
        if (isFlash && !flash?.ok) fill = FILL.wrong
        else if (isNext) fill = FILL.next
        else if (isHold) fill = FILL.hold
        else if (isFlash) fill = FILL.pressed
        if (isNext || isHold || isFlash) ink = INK.lit

        return (
          <g key={k.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={CAP}
              rx={1.8}
              fill={fill}
              stroke={
                isHold || adds.has(k.id) ? "#3f9e77" : known ? "#2e2b26" : "#1f1d1a"
              }
              strokeWidth={isHold ? 0.9 : 0.35}
              style={{ transition: "fill 120ms ease-out" }}
            />
            {k.w === 1 && (
              <use
                href={`/train/caps.svg#${k.id}`}
                x={x}
                y={y}
                width={CAP}
                height={CAP}
                fill={ink}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
