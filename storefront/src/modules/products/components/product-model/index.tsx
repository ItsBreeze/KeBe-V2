"use client"

import Image from "next/image"
import Script from "next/script"
import {
  createElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { clx } from "@medusajs/ui"

// Google's <model-viewer> web component (the full bundle, three.js included),
// loaded only on pages that show a model. createElement rather than JSX: a
// custom element has no JSX type, and this keeps it to one file.
const MODEL_VIEWER =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"

// Vertical field of view, and the board's size as the camera sees it at the
// most it spans while turning (metres): 257 mm across, and up to about
// 135 mm top to bottom when it points at the camera.
const FOV_DEG = 22
// The idle sway: this far either side of the starting azimuth, once per period.
const SWAY_DEG = 15
const SWAY_MS = 9000
const BOARD_W = 0.27
const BOARD_H = 0.135

// The distance at which the board fills `fill` of the frame's width without
// overflowing its height. model-viewer's own framing fits the bounding sphere,
// which leaves a long, flat board small, and a fixed distance clipped it on
// narrow screens.
function fitRadius(w: number, h: number, fill: number) {
  const vf = (FOV_DEG * Math.PI) / 180
  const hf = 2 * Math.atan(Math.tan(vf / 2) * (w / h))
  const byWidth = BOARD_W / fill / (2 * Math.tan(hf / 2))
  const byHeight = BOARD_H / 0.9 / (2 * Math.tan(vf / 2))
  return Math.max(byWidth, byHeight)
}

// The model (scripts/render-v2, view=glb) has its LEDs on: each legend and
// the spill round each cap are emissive, so it is shown on a dark ground with
// the room lighting turned down, where the colour carries.
//
// Idle, it sways slowly back and forth about its starting angle (a full turn
// was too much; the owner's call, 30 Sept 2026) and ignores the pointer until
// it is clicked: a viewer that takes drags and the scroll wheel straight away
// traps a page scrolling past it. Clicked, it takes drag (turn), wheel and pinch (zoom); Done, Esc or
// a click elsewhere hands the page back and returns it to its starting view.
//
// `framed` is a bordered box; `backdrop` fills its parent edge to edge, and
// `children` are laid over it (the homepage's name and Pre-order), fading out
// while the model is in use so the whole area can be dragged.
//
// `posterFirst` (the product page) draws the poster as a plain image in the
// server's HTML, labelled as a render, and loads model-viewer's script only
// once the page has finished loading. model-viewer draws its own poster only
// after its 1 MB script has run, so a phone's first screen was a dark, empty
// box, and parsing that script held up the Pre-order button. The model still
// sways on landing; it appears a moment later, behind the still (6 Oct 2026).
export default function ProductModel({
  src,
  poster,
  alt,
  posterFirst = false,
  posterAlt = "",
  eager = false,
  angle = "-25deg 60deg",
  fill = 0.8,
  variant = "framed",
  className,
  stageClassName = "inset-0",
  children,
}: {
  src: string
  poster?: string
  alt: string
  posterFirst?: boolean
  // What the still shows, for screen readers: it is a render.
  posterAlt?: string
  // The homepage hero loads it straight away; elsewhere it waits until seen.
  eager?: boolean
  // Starting azimuth and polar angle.
  angle?: string
  // Share of the frame's width the board fills at the starting view.
  fill?: number
  variant?: "framed" | "backdrop"
  className?: string
  // Where the model sits inside the box: a backdrop keeps it clear of the
  // text laid over its top.
  stageClassName?: string
  children?: ReactNode
}) {
  const [active, setActive] = useState(false)
  const [orbit, setOrbit] = useState(`${angle} 0.7m`)
  // posterFirst: the still stays in front until model-viewer's load event.
  const [loaded, setLoaded] = useState(false)
  // "Click" told phones to click. The server cannot know which it is, so the
  // HTML says neither, and the browser picks (6 Oct 2026).
  const [idleLabel, setIdleLabel] = useState("Turn it yourself")
  const box = useRef<HTMLDivElement>(null)
  const viewer = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setIdleLabel(
      window.matchMedia("(pointer: coarse)").matches
        ? "Tap to turn it yourself"
        : "Click to turn it yourself"
    )
  }, [])

  useEffect(() => {
    const mv = viewer.current as any
    if (!posterFirst || !mv) return
    if (mv.loaded) {
      setLoaded(true)
      return
    }
    const onLoad = () => setLoaded(true)
    mv.addEventListener("load", onLoad)
    return () => mv.removeEventListener("load", onLoad)
  }, [posterFirst])

  useEffect(() => {
    const el = viewer.current
    if (!el) return
    const measure = () => {
      if (!el.clientWidth || !el.clientHeight) return
      const r = fitRadius(el.clientWidth, el.clientHeight, fill)
      setOrbit(`${angle} ${r.toFixed(3)}m`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [angle, fill])

  const finish = useCallback(() => {
    setActive(false)
    // Back to the starting view.
    const mv = viewer.current as any
    if (mv) {
      mv.cameraOrbit = orbit
      mv.fieldOfView = `${FOV_DEG}deg`
    }
  }, [orbit])

  // The sway: the camera's azimuth follows a slow sine while idle and on
  // screen. Not under reduced motion, and not while someone is turning it.
  useEffect(() => {
    const mv = viewer.current as any
    if (active || !mv) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const [az, polar, radius] = orbit.split(/\s+/)
    const base = parseFloat(az)
    const t0 = performance.now()
    let raf = 0
    let visible = true
    const tick = (now: number) => {
      raf = 0
      if (!visible) return
      const a = base + SWAY_DEG * Math.sin(((now - t0) / SWAY_MS) * 2 * Math.PI)
      mv.cameraOrbit = `${a.toFixed(2)}deg ${polar} ${radius}`
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(mv)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [active, orbit])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish()
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) finish()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onDown)
    }
  }, [active, finish])

  const framed = variant === "framed"

  return (
    <div
      ref={box}
      className={clx(
        "relative w-full overflow-hidden",
        framed &&
          "rounded-2xl border bg-[radial-gradient(ellipse_at_50%_55%,#2a2620_0%,#1c1a17_45%,#12110f_100%)] transition-colors",
        framed && (active ? "border-kebe-muted" : "border-kebe-line"),
        className
      )}
      data-testid="product-model"
    >
      {/* crossOrigin: a module script is fetched in CORS mode, and Next's
          preload of it (afterInteractive) was not, so the browser fetched
          it twice and warned that the preload went unused (6 Oct 2026). */}
      <Script
        type="module"
        src={MODEL_VIEWER}
        crossOrigin="anonymous"
        strategy={eager && !posterFirst ? "afterInteractive" : "lazyOnload"}
      />
      {createElement("model-viewer", {
        ref: viewer,
        className: `absolute ${stageClassName}`,
        src,
        poster,
        alt,
        loading: eager ? "eager" : "lazy",
        // A glTF is metres and the model is true size, so AR shows it at 257 mm.
        ar: true,
        "ar-modes": "webxr scene-viewer quick-look",
        // Present (as an empty attribute) only while it is in use.
        "camera-controls": active ? "" : undefined,
        // No auto-rotate: the idle motion is the sway above.
        "interaction-prompt": "none",
        "camera-orbit": orbit,
        "field-of-view": `${FOV_DEG}deg`,
        "min-camera-orbit": "auto 10deg 0.2m",
        "max-camera-orbit": "auto 88deg 2m",
        "environment-image": "neutral",
        exposure: "0.55",
        "shadow-intensity": "0.9",
        "shadow-softness": "1",
        "touch-action": "pan-y",
        // model-viewer's own :host rule sizes it 300 x 150; auto lets the
        // insets from stageClassName size it instead.
        style: {
          display: "block",
          width: "auto",
          height: "auto",
          backgroundColor: "transparent",
          "--poster-color": "transparent",
        },
      })}
      {posterFirst && poster && (
        // Fades out once the model has loaded behind it. unoptimized: the
        // same URL as model-viewer's poster, so it downloads once. Cover,
        // not contain: the still's board then spans about the width the
        // model's does (fill), where contain drew it a sixth narrower.
        <div
          aria-hidden={loaded || undefined}
          className={clx(
            "pointer-events-none absolute inset-0 transition-opacity duration-300",
            loaded && "opacity-0"
          )}
        >
          <Image
            src={poster}
            alt={posterAlt}
            fill
            priority
            unoptimized
            sizes="(max-width: 1024px) 100vw, 800px"
            className="object-cover"
          />
          {!active && (
            <span className="absolute left-4 top-3 text-small-regular text-white/80">
              CAD render
            </span>
          )}
        </div>
      )}
      {!active && (
        // Over the whole frame, so a click anywhere on the model starts it.
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 flex cursor-pointer items-end justify-center !rounded-none pb-5"
          aria-label="Turn the 3D model yourself"
        >
          <span className="rounded-xl border border-kebe-line bg-kebe-page/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-kebe-text backdrop-blur transition-colors group-hover:border-kebe-muted">
            {idleLabel}
          </span>
        </button>
      )}
      {children && (
        // Laid over the model. Clicks pass through to the model except on
        // the overlay's own links and fields.
        <div
          className={clx(
            "pointer-events-none absolute inset-0 transition-opacity duration-300",
            active && "opacity-0"
          )}
        >
          <div className={clx(!active && "[&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_form]:pointer-events-auto")}>
            {children}
          </div>
        </div>
      )}
      {active && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-kebe-muted">
            Drag to turn · scroll or pinch to zoom
          </span>
          <button
            type="button"
            onClick={finish}
            className="pointer-events-auto rounded-xl border border-kebe-line bg-kebe-page/80 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-kebe-text backdrop-blur hover:border-kebe-muted"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
