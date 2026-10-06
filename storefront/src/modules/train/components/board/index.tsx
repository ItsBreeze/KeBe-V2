import type { CSSProperties } from "react"

import { Finger, KEYS, Stroke, Touch, touchOf } from "@lib/train/layout"

// KeBe drawn to scale and lit the way the board is: black caps on the 18 x
// 17 mm grid, each carrying its printed legends (public/train/caps.svg, the
// laser's own art), and the per-key lighting showing through them. Every
// key glows in the colour of the finger that strikes it, so the map of
// which finger goes where is the board itself (owner, 6 Oct 2026).
//
// The caps stay off: every legend unlit and every rim plain. The keys in
// play (learned: the levels so far; adds: this level's new key; both space
// bars, always) show by the light under them, each in its finger's colour.
// The key to press has its legend lit and extra light under it, pulsing;
// for Space that is the bar of the thumb to use. A Shift or Fn to hold is
// lit and outlined too (owner, 6 Oct 2026). flash: the key just pressed.

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
const DARK = "#1c1a17"
// A legend with its light off: readable grey on the black cap.
const UNLIT = "#85807a"
const WHITE = "#ffffff"

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `#${x
    .map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0"))
    .join("")}`
}

// A legend lit in a finger's colour: lifted towards white so the darker
// colours (the thumb's green) still read on a black cap, then dimmed by how
// strongly the key is lit.
const lit = (colour: string, strength: number, lift = 0.25) =>
  mix(DARK, mix(colour, WHITE, lift), strength)

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

  const keys = KEYS.map((k) => {
    const colour = FINGER_COLOUR[touchOf(k).finger]
    const known = learned.has(k.id) || adds.has(k.id)
    const isNext = nextKeys.has(k.id)
    const isHold = holdKeys.has(k.id)
    const isFlash = flashKeys.has(k.id)
    const wrong = isFlash && !flash?.ok

    // Every legend unlit, the same on every key, except the key to press.
    let ink = UNLIT
    // The light under the caps: the keys in play, the space bars included.
    let glow = known ? 0.42 : 0
    let rim = "#24211d"
    let rimWidth = 0.35
    let glowColour = colour
    if (wrong) {
      ink = "#ff8a7a"
      glow = 0.8
      glowColour = "#e0453a"
    } else if (isNext) {
      ink = lit(colour, 1, 0.6)
      glow = 1
      rim = colour
      rimWidth = 0.7
    } else if (isHold) {
      ink = lit(colour, 1, 0.45)
      glow = 0.55
      rim = colour
      rimWidth = 0.9
    } else if (isFlash) {
      glow = 0.6
    }
    return { k, ink, glow, glowColour, rim, rimWidth, isNext }
  })

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
      className={className}
      style={style}
      role="img"
      aria-label={
        next
          ? `KeBe's keys, each lit in the colour of the finger that presses it, with ${next.name} lit brightest as the next key`
          : "KeBe's keys, each lit in the colour of the finger that presses it"
      }
    >
      <defs>
        <linearGradient id="kebe-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2723" />
          <stop offset="0.45" stopColor="#181614" />
          <stop offset="1" stopColor="#0f0e0c" />
        </linearGradient>
        <filter id="kebe-spill" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id="kebe-legend" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes kebe-pulse { 0%, 100% { opacity: 0.95 } 50% { opacity: 0.55 } }
          .kebe-next { animation: kebe-pulse 1.4s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .kebe-next { animation: none } }
        `}</style>
      </defs>
      <rect
        x={-pad}
        y={-pad}
        width={w + 2 * pad}
        height={h + 2 * pad}
        rx={4}
        fill="#0b0a09"
        stroke="#2e2b26"
        strokeWidth={0.4}
      />
      {/* The light under the caps, behind them. */}
      {keys.map(({ k, glow, glowColour, isNext }) =>
        glow > 0 ? (
          <rect
            key={`glow-${k.id}`}
            className={isNext ? "kebe-next" : undefined}
            x={k.col * PITCH_X - 1.6}
            y={k.row * PITCH_Y - 1.6}
            width={(k.w === 2 ? PITCH_X + CAP : CAP) + 3.2}
            height={CAP + 3.2}
            rx={3.5}
            fill={glowColour}
            opacity={glow}
            filter="url(#kebe-spill)"
            style={{ transition: "opacity 150ms ease-out" }}
          />
        ) : null
      )}
      {keys.map(({ k, ink, rim, rimWidth, isNext }) => {
        const x = k.col * PITCH_X
        const y = k.row * PITCH_Y
        const width = k.w === 2 ? PITCH_X + CAP : CAP
        return (
          <g key={k.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={CAP}
              rx={1.8}
              fill="url(#kebe-cap)"
              stroke={rim}
              strokeWidth={rimWidth}
            />
            {k.w === 1 && (
              // The glow wraps the legend in a group: a filter straight on
              // <use> drops the legend in some renderers.
              <g filter={isNext ? "url(#kebe-legend)" : undefined}>
                <use
                  href={`/train/caps.svg#${k.id}`}
                  x={x}
                  y={y}
                  width={CAP}
                  height={CAP}
                  fill={ink}
                  style={{ transition: "fill 120ms ease-out" }}
                />
              </g>
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
