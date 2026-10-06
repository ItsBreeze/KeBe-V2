import type { CSSProperties } from "react"

import { Finger, KEYS, Stroke, Touch, touchOf } from "@lib/train/layout"

// KeBe drawn to scale: 16.5 mm caps on the 18 x 17 mm grid, each carrying
// its printed legends (public/train/caps.svg, the laser's own art), every key
// tinted by the finger that strikes it, so the whole map of which finger goes
// where is on the board at once (owner, 5 Oct 2026).
//
// learned: keys the levels so far have taught. adds: the keys this level
// introduces. next: what to press now, filled with its finger's colour, and
// the Shift or Fn to hold, outlined. flash: the key just pressed.

// The five fingers' colours, the same on both hands. Chosen with the dataviz
// validator on the cap colour: every pair of fingers whose keys sit side by
// side (pinky-ring-middle-pointer, and the thumbs beside the ring, middle and
// pointer keys on the bottom row) clears CVD Delta E 13 and normal-vision 19.7.
export const FINGER_COLOUR: Record<Finger, string> = {
  pinky: "#d95926",
  ring: "#9085e9",
  middle: "#d55181",
  pointer: "#3987e5",
  thumb: "#008300",
}

const CAP = 16.5
const PITCH_X = 18
const PITCH_Y = 17
const CAP_FILL = "#1c1a17"

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `#${x
    .map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0"))
    .join("")}`
}

// Whichever legend colour, dark or white, has the higher WCAG contrast on a
// solid finger colour (white on the thumb's green, dark on the others).
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function inkOn(hex: string) {
  const l = luminance(hex)
  const dark = (l + 0.05) / (luminance("#12110f") + 0.05)
  const white = 1.05 / (l + 0.05)
  return dark >= white ? "#12110f" : "#ffffff"
}

type Props = {
  learned: Set<string>
  adds: Set<string>
  next: Stroke | null
  flash: { keys: string[]; ok: boolean } | null
  className?: string
  style?: CSSProperties
}

export default function Board({ learned, adds, next, flash, className, style }: Props) {
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
      style={style}
      role="img"
      aria-label={
        next
          ? `KeBe's keys, coloured by finger, with ${next.name} lit as the next key to press`
          : "KeBe's keys, coloured by the finger that presses each"
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
        const colour = FINGER_COLOUR[touchOf(k).finger]
        const isNew = adds.has(k.id)
        const known = learned.has(k.id) || isNew
        const isNext = nextKeys.has(k.id)
        const isHold = holdKeys.has(k.id)
        const isFlash = flashKeys.has(k.id)

        // Keys still to come keep a faint tint, so the whole map shows.
        let fill = mix(CAP_FILL, colour, isNew ? 0.34 : known ? 0.18 : 0.07)
        let ink = !known ? "#3b3732" : isNew ? "#ffffff" : "#d8d2c8"
        let stroke = !known ? mix(CAP_FILL, colour, 0.15) : isNew ? colour : mix(CAP_FILL, colour, 0.4)
        let strokeWidth = isNew ? 0.6 : 0.35
        if (isFlash && !flash?.ok) {
          fill = "#7a2b25"
          ink = "#ffffff"
        } else if (isNext) {
          fill = colour
          ink = inkOn(colour)
          stroke = "#ffffff"
          strokeWidth = 0.6
        } else if (isHold) {
          fill = mix(CAP_FILL, colour, 0.5)
          ink = "#ffffff"
          stroke = colour
          strokeWidth = 1
        } else if (isFlash) {
          fill = mix(CAP_FILL, colour, 0.55)
          ink = "#ffffff"
        }

        return (
          <g key={k.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={CAP}
              rx={1.8}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
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

// The key to the colours, with the finger for the next key marked.
export function FingerKey({ press }: { press: Touch | null }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-kebe-muted">
      {(Object.keys(FINGER_COLOUR) as Finger[]).map((f) => (
        <li
          key={f}
          className={press?.finger === f ? "text-kebe-text" : undefined}
        >
          <span
            aria-hidden
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]"
            style={{
              background: FINGER_COLOUR[f],
              boxShadow: press?.finger === f ? "0 0 0 2px #f5f1ea" : undefined,
            }}
          />
          {f}
          {press?.finger === f ? ` · ${press.hand}` : ""}
        </li>
      ))}
    </ul>
  )
}
