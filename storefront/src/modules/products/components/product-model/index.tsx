"use client"

import Script from "next/script"
import { createElement } from "react"
import { clx } from "@medusajs/ui"

// Google's <model-viewer> web component (the full bundle, three.js included),
// loaded only on pages that show a model. createElement rather than JSX: a
// custom element has no JSX type, and this keeps it to one file.
const MODEL_VIEWER =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"

// The model (scripts/render-v2, view=glb) has its LEDs on: each legend and
// the spill round each cap are emissive, so it is shown on a dark ground with
// the room lighting turned down, where the colour carries.
export default function ProductModel({
  src,
  poster,
  alt,
  eager = false,
  // model-viewer frames the bounding sphere, which leaves a long, flat board
  // small in the frame. The default distance fills about 80% of a 4:3 frame's
  // width at the starting angle; wider frames pass a closer one.
  orbit = "-25deg 60deg 0.7m",
  className,
  caption = "3D model from the CAD · drag to turn",
}: {
  src: string
  poster?: string
  alt: string
  // The homepage hero loads it straight away; elsewhere it waits until seen.
  eager?: boolean
  orbit?: string
  className?: string
  caption?: string | null
}) {
  return (
    <div
      className={clx("relative w-full overflow-hidden", className)}
      data-testid="product-model"
    >
      <Script
        type="module"
        src={MODEL_VIEWER}
        strategy={eager ? "afterInteractive" : "lazyOnload"}
      />
      {createElement("model-viewer", {
        src,
        poster,
        alt,
        loading: eager ? "eager" : "lazy",
        // A glTF is metres and the model is true size, so AR shows it at 257 mm.
        ar: true,
        "ar-modes": "webxr scene-viewer quick-look",
        "camera-controls": true,
        "auto-rotate": true,
        "auto-rotate-delay": "0",
        "rotation-per-second": "18deg",
        "interaction-prompt": "none",
        "camera-orbit": orbit,
        "field-of-view": "22deg",
        "min-camera-orbit": "auto 10deg 0.3m",
        "max-camera-orbit": "auto 88deg 1.2m",
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
      {caption && (
        <p className="pointer-events-none absolute bottom-3 left-4 text-small-regular text-white/50">
          {caption}
        </p>
      )}
    </div>
  )
}
