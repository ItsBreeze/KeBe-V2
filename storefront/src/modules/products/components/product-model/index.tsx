"use client"

import Script from "next/script"
import { createElement, useCallback, useEffect, useRef, useState } from "react"
import { clx } from "@medusajs/ui"

// Google's <model-viewer> web component (the full bundle, three.js included),
// loaded only on pages that show a model. createElement rather than JSX: a
// custom element has no JSX type, and this keeps it to one file.
const MODEL_VIEWER =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"

const FOV = "22deg"

// The model (scripts/render-v2, view=glb) has its LEDs on: each legend and
// the spill round each cap are emissive, so it is shown on a dark ground with
// the room lighting turned down, where the colour carries.
//
// It turns on its own and ignores the pointer until it is clicked: a viewer
// that takes drags and the scroll wheel straight away traps a page scrolling
// past it. Clicked, it takes drag (turn), wheel and pinch (zoom); Done, Esc or
// a click elsewhere hands the page back and returns it to its starting view.
export default function ProductModel({
  src,
  poster,
  alt,
  eager = false,
  // model-viewer frames the bounding sphere, which leaves a long, flat board
  // small in the frame. The default distance fills about 80% of a 4:3 frame's
  // width at the starting angle; wider frames pass their own.
  orbit = "-25deg 60deg 0.7m",
  className,
}: {
  src: string
  poster?: string
  alt: string
  // The homepage hero loads it straight away; elsewhere it waits until seen.
  eager?: boolean
  orbit?: string
  className?: string
}) {
  const [active, setActive] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const viewer = useRef<HTMLElement | null>(null)

  const finish = useCallback(() => {
    setActive(false)
    // Back to the starting view, so the board turns the right way round again.
    const mv = viewer.current as any
    if (mv) {
      mv.cameraOrbit = orbit
      mv.fieldOfView = FOV
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

  return (
    <div
      ref={box}
      className={clx(
        "relative w-full overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_at_50%_55%,#2a2620_0%,#1c1a17_45%,#12110f_100%)] transition-colors",
        active ? "border-kebe-muted" : "border-kebe-line",
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
        "field-of-view": FOV,
        "min-camera-orbit": "auto 10deg 0.3m",
        "max-camera-orbit": "auto 88deg 1.4m",
        "environment-image": "neutral",
        exposure: "0.55",
        "shadow-intensity": "0.9",
        "shadow-softness": "1",
        "touch-action": "pan-y",
        style: {
          width: "100%",
          height: "100%",
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
