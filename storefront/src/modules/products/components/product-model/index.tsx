"use client"

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
// It turns on its own and ignores the pointer until it is clicked: a viewer
// that takes drags and the scroll wheel straight away traps a page scrolling
// past it. Clicked, it takes drag (turn), wheel and pinch (zoom); Done, Esc or
// a click elsewhere hands the page back and returns it to its starting view.
//
// `framed` is a bordered box; `backdrop` fills its parent edge to edge, and
// `children` are laid over it (the homepage's name and Pre-order), fading out
// while the model is in use so the whole area can be dragged.
export default function ProductModel({
  src,
  poster,
  alt,
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
  const box = useRef<HTMLDivElement>(null)
  const viewer = useRef<HTMLElement | null>(null)

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
    // Back to the starting view, so the board turns the right way round again.
    const mv = viewer.current as any
    if (mv) {
      mv.cameraOrbit = orbit
      mv.fieldOfView = `${FOV_DEG}deg`
    }
  }, [orbit])

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
      <Script
        type="module"
        src={MODEL_VIEWER}
        strategy={eager ? "afterInteractive" : "lazyOnload"}
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
        "auto-rotate": "",
        // Turning at once while idle; in use, only after 3 s left alone.
        "auto-rotate-delay": active ? "3000" : "0",
        "rotation-per-second": "18deg",
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
      {!active && (
        // Over the whole frame, so a click anywhere on the model starts it.
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 flex cursor-pointer items-end justify-center !rounded-none pb-5"
          aria-label="Turn the 3D model yourself"
        >
          <span className="rounded-xl border border-kebe-line bg-kebe-page/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-kebe-text backdrop-blur transition-colors group-hover:border-kebe-muted">
            Click to turn it yourself
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
