import type { CSSProperties } from "react"

import { Finger, KEYS, Stroke, Touch, touchOf } from "@lib/train/layout"

// KeBe drawn to scale and lit the way the board is: black caps on the 18 x
// 17 mm grid, each carrying its engraved legends (public/train/caps.svg, the
// laser's own art), and the per-key lighting coming up round them. Every key
// in play glows in the colour of the finger that strikes it, so the map of
// which finger goes where is the board itself (owner, 6 Oct 2026).
//
// The caps stay off and black: every legend an unlit etch, and all the light
// underneath them, so it shows only in the gaps and on the plate round the
// board. The keys in play (learned: the levels so far; adds: this level's
// new key; both space bars, always) sit on a saturated band of their
// finger's light with a bloom round it, so the set in play reads as one
// glowing, colour-coded shape. The key to press has its legend lit in its
// finger's colour, a neon ring at its edge and a big pool of light under it
// that pulses; for Space that is the bar of the thumb to use. A Shift or Fn
// to hold is lit too, with a steady ring and pool (owner, 6 Oct 2026).
// flash: the key just pressed; a wrong one flashes red.

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
const WHITE = "#ffffff"
// Legends with their light off: an etch in the black coating, faint on the
// keys in play and fainter still on the rest. A phone draws them a third the
// size, so there they are a shade lighter (kebe-etch in the style below).
const ETCH = "#4a4640"
const ETCH_IDLE = "#2a2826"

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const hex = (c: number[]) =>
  `#${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`

function mix(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)]
  return hex(x.map((v, i) => v + (y[i] - v) * t))
}

// The same hue at a new saturation and lightness: the light itself is a
// brighter, purer tint of each finger's colour than the printed swatch.
function tone(colour: string, s: number, l: number) {
  const [r, g, b] = rgb(colour)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = l - c / 2
  const [p, q, t] =
    h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]
  return hex([p + m, q + m, t + m])
}

// Per finger, the light: pure and saturated, all five at about the same
// luminance (0.27-0.30) so no finger out-shouts the key to press.
const NEON_TONE: Record<Finger, [number, number]> = {
  pinky: [1, 0.57],
  ring: [0.95, 0.74],
  middle: [1, 0.63],
  pointer: [1, 0.6],
  thumb: [0.8, 0.37],
}
// neon: the band, bloom and rings; core: the white-hot light round the
// key to press;
// ink: a lit legend, the LED's own colour shining through the etch; held:
// a held key's legend, a little deeper.
type Light = { neon: string; core: string; ink: string; held: string }
const light = (neon: string): Light => ({
  neon,
  core: mix(neon, WHITE, 0.82),
  ink: mix(neon, WHITE, 0.42),
  held: mix(neon, WHITE, 0.25),
})
const LIGHT = Object.fromEntries(
  (Object.keys(FINGER_COLOUR) as Finger[]).map((f) => [
    f,
    light(tone(FINGER_COLOUR[f], ...NEON_TONE[f])),
  ])
) as Record<Finger, Light>
// A wrong key: red through and through.
const WRONG: Light = {
  neon: "#ff2a1f",
  core: "#ff7a70",
  ink: "#ffa49c",
  held: "#ffa49c",
}

const OFF = 0
const PLAY = 1
const HIT = 2
const HOLD = 3
const NEXT = 4
const MISS = 5

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
  // Room round the keys for the light, in the proportions the page sizes
  // the board by (2.83 : 1).
  const padX = 7
  const padY = 4.4
  const vb = { x: -padX, y: -padY, width: w + 2 * padX, height: h + 2 * padY }

  const keys = KEYS.map((k) => {
    const known = learned.has(k.id) || adds.has(k.id)
    const isFlash = flashKeys.has(k.id)
    const state =
      isFlash && !flash?.ok
        ? MISS
        : nextKeys.has(k.id)
          ? NEXT
          : holdKeys.has(k.id)
            ? HOLD
            : isFlash
              ? HIT
              : known
                ? PLAY
                : OFF
    const lit = state === MISS ? WRONG : LIGHT[touchOf(k).finger]
    // A space bar's band runs twice as far as a key's, so it is drawn
    // softer to weigh about the same.
    const weight = k.w === 2 && state < HOLD ? 0.7 : 1
    return { k, lit, state, weight }
  })

  const box = (k: (typeof KEYS)[number], grow: number) => ({
    x: k.col * PITCH_X - grow,
    y: k.row * PITCH_Y - grow,
    width: (k.w === 2 ? PITCH_X + CAP : CAP) + 2 * grow,
    height: CAP + 2 * grow,
  })

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
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
        <clipPath id="kebe-tray">
          <rect {...vb} rx={5} />
        </clipPath>
        {/* A black cap: flat, with the faintest lift along the top. */}
        <linearGradient id="kebe-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111111" />
          <stop offset="0.12" stopColor="#070707" />
          <stop offset="1" stopColor="#030303" />
        </linearGradient>
        {/* The light on the plate round the keys in play. */}
        <filter id="kebe-bloom" filterUnits="userSpaceOnUse" {...vb}>
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        {/* The band under each cap's edge: sharp, over its own soft halo. */}
        <filter id="kebe-neon" filterUnits="userSpaceOnUse" {...vb}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* The key to press: a wide pool of light under it. */}
        <filter id="kebe-flare" x="-80%" y="-120%" width="260%" height="340%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
        <filter id="kebe-hot" x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="kebe-legend" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.45" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes kebe-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
          .kebe-pulse { animation: kebe-pulse 1.2s ease-in-out infinite }
          @media (max-width: 640px) {
            .kebe-etch { fill: #5a554e }
            .kebe-etch-idle { fill: #34312d }
          }
          @media (prefers-reduced-motion: reduce) {
            .kebe-pulse { animation: none }
          }
        `}</style>
      </defs>
      <rect {...vb} rx={5} fill="#0a0a0a" stroke="#24211d" strokeWidth={0.5} />
      <g clipPath="url(#kebe-tray)">
        {/* All the light is under the caps, added like light: it shows in
            the gaps and on the plate, never on a cap's face. */}
        <g style={{ mixBlendMode: "screen" }}>
          <g filter="url(#kebe-bloom)">
            {keys.map(({ k, lit, state, weight }) =>
              state > OFF ? (
                <rect
                  key={`bloom-${k.id}`}
                  {...box(k, 1)}
                  rx={3}
                  fill={lit.neon}
                  opacity={(state === PLAY ? 0.6 : 1) * weight}
                />
              ) : null
            )}
          </g>
          <g filter="url(#kebe-neon)">
            {keys.map(({ k, lit, state, weight }) =>
              state > OFF && state !== NEXT ? (
                <rect
                  key={`band-${k.id}`}
                  {...box(k, 0.5)}
                  rx={2.6}
                  fill="none"
                  stroke={lit.neon}
                  strokeWidth={state === PLAY || state === HOLD ? 1 : 1.6}
                  opacity={(state === PLAY ? 0.9 : 1) * weight}
                />
              ) : null
            )}
          </g>
          {/* The key to press: a wide pool of its light and a hot band
              hugging its edge, pulsing together. A key to hold: a steady,
              smaller pool. */}
          {keys.map(({ k, lit, state }) =>
            state >= HOLD ? (
              <g key={`pool-${k.id}`}>
                <rect
                  {...box(k, 3.2)}
                  rx={5.5}
                  fill={lit.neon}
                  opacity={state === HOLD ? 0.22 : 1}
                  filter="url(#kebe-flare)"
                  className={state === NEXT ? "kebe-pulse" : undefined}
                />
                {state === NEXT && (
                  <rect
                    {...box(k, 0.5)}
                    rx={2.6}
                    fill="none"
                    stroke={lit.neon}
                    strokeWidth={2.2}
                    filter="url(#kebe-hot)"
                  />
                )}
              </g>
            ) : null
          )}
        </g>
        {/* The caps, black, each a crisp silhouette on its light. A wrong
            key's face flashes red. */}
        {keys.map(({ k, lit, state }) => (
          <g key={k.id}>
            <rect
              {...box(k, 0)}
              rx={2.2}
              fill="url(#kebe-cap)"
              stroke={state === OFF ? "#1c1b19" : "none"}
              strokeWidth={0.3}
            />
            {state === MISS && <rect {...box(k, 0)} rx={2.2} fill={lit.neon} opacity={0.4} />}
          </g>
        ))}
        {/* A neon ring at the edge of the key to press, thinner on a key to
            hold, and on a wrong key, in red. */}
        {keys.map(({ k, lit, state }) =>
          state >= HOLD ? (
            <g key={`ring-${k.id}`}>
              <rect
                {...box(k, state === HOLD ? -0.1 : -0.7)}
                rx={state === HOLD ? 2.1 : 1.6}
                fill="none"
                stroke={lit.neon}
                strokeWidth={state === HOLD ? 0.7 : 1.4}
              />
              {/* The key to press: a white-hot line down the middle of its
                  neon, at the cap's edge, as in a lit tube. */}
              {state === NEXT && (
                <rect {...box(k, 0)} rx={2.2} fill="none" stroke={lit.core} strokeWidth={0.45} />
              )}
            </g>
          ) : null
        )}
        {/* The legends: an unlit etch, except on the key to press and the
            key to hold, which shine through in their finger's light: a
            saturated glow under a brighter core, as an LED does. */}
        {keys.map(({ k, lit, state }) => {
          if (k.w !== 1) return null
          const { x, y } = box(k, 0)
          const at = { href: `/train/caps.svg#${k.id}`, x, y, width: CAP, height: CAP }
          if (state === NEXT || state === HOLD)
            return (
              <g key={`legend-${k.id}`}>
                {/* The glow wraps the legend in a group: a filter straight
                    on <use> drops the legend in some renderers. */}
                <g filter="url(#kebe-legend)">
                  <use {...at} fill={lit.neon} />
                </g>
                <use {...at} fill={state === NEXT ? lit.ink : lit.held} />
              </g>
            )
          return (
            <use
              key={`legend-${k.id}`}
              {...at}
              className={state === MISS ? undefined : state > OFF ? "kebe-etch" : "kebe-etch-idle"}
              fill={state === MISS ? "#2a0806" : state > OFF ? ETCH : ETCH_IDLE}
            />
          )
        })}
      </g>
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
