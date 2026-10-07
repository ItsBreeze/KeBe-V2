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
// Legends with their light off: readable grey on the keys in play, dimmer
// on the keys still to come, so the set in play stands out.
const UNLIT = "#9a948a"
const IDLE = "#4f4a44"
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

    // Legends stay unlit: readable on the keys in play, dim on the rest.
    let ink = known ? UNLIT : IDLE
    // How much light comes up round the cap: the keys in play glow.
    let glow = known ? 0.6 : 0
    let rim = "#1d1b19"
    let rimWidth = 0.3
    let glowColour = colour
    if (wrong) {
      ink = "#ff8a7a"
      glow = 1
      glowColour = "#e0453a"
    } else if (isNext) {
      ink = lit(colour, 1, 0.65)
      glow = 1
      rim = mix(colour, WHITE, 0.2)
      rimWidth = 0.55
    } else if (isHold) {
      ink = lit(colour, 1, 0.45)
      glow = 0.85
      rim = colour
      rimWidth = 0.8
    } else if (isFlash) {
      glow = Math.max(glow, 0.85)
    }
    return { k, ink, glow, glowColour, rim, rimWidth, isNext }
  })

  const box = (k: (typeof KEYS)[number], grow: number) => ({
    x: k.col * PITCH_X - grow,
    y: k.row * PITCH_Y - grow,
    width: (k.w === 2 ? PITCH_X + CAP : CAP) + 2 * grow,
    height: CAP + 2 * grow,
  })

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
      className={className}
      style={style}
      role="img"
      aria-label={
        next
          ? `KeBe's keys, the ones in play lit from underneath in the colour of the finger that presses each, with ${next.name} lit as the next key`
          : "KeBe's keys, the ones in play lit from underneath in the colour of the finger that presses each"
      }
    >
      <defs>
        {/* A black cap, as KeBe's are: a faint sheen along the top edge only. */}
        <linearGradient id="kebe-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1a18" />
          <stop offset="0.1" stopColor="#0c0c0b" />
          <stop offset="1" stopColor="#060606" />
        </linearGradient>
        <filter id="kebe-halo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="kebe-edge" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <filter id="kebe-legend" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes kebe-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.6 } }
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
        fill="#0e0d0c"
        stroke="#23201c"
        strokeWidth={0.4}
      />
      {/* The light under the caps: a wide soft halo and a bright edge in
          the gaps, added like light (screen) rather than painted over. */}
      <g style={{ mixBlendMode: "screen" }}>
        {keys.map(({ k, glow, glowColour, isNext }) =>
          glow > 0 ? (
            <g
              key={`glow-${k.id}`}
              className={isNext ? "kebe-next" : undefined}
              opacity={glow}
              style={{ transition: "opacity 150ms ease-out" }}
            >
              <rect {...box(k, 2.4)} rx={4} fill={glowColour} opacity={0.55} filter="url(#kebe-halo)" />
              <rect {...box(k, 0.7)} rx={2.4} fill={glowColour} opacity={0.95} filter="url(#kebe-edge)" />
            </g>
          ) : null
        )}
      </g>
      {keys.map(({ k, ink, rim, rimWidth, isNext }) => {
        const { x, y, width } = box(k, 0)
        return (
          <g key={k.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={CAP}
              rx={2}
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
