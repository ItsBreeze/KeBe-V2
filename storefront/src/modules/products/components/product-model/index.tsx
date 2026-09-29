"use client"

import Script from "next/script"
import { createElement } from "react"

// Google's <model-viewer> web component (the full bundle, three.js included),
// loaded only on pages that show a model. createElement rather than JSX: a
// custom element has no JSX type, and this keeps it to one file.
const MODEL_VIEWER =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js"

export default function ProductModel({
  src,
  poster,
  alt,
}: {
  src: string
  poster?: string
  alt: string
}) {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-rounded bg-ui-bg-subtle"
      data-testid="product-model"
    >
      <Script type="module" src={MODEL_VIEWER} strategy="lazyOnload" />
      {createElement("model-viewer", {
        src,
        poster,
        alt,
        // A glTF is metres and the model is true size, so AR shows it at 257 mm.
        ar: true,
        "ar-modes": "webxr scene-viewer quick-look",
        "camera-controls": true,
        "auto-rotate": true,
        "camera-orbit": "-25deg 62deg auto",
        "shadow-intensity": "1",
        exposure: "1.1",
        "touch-action": "pan-y",
        style: { width: "100%", height: "100%", backgroundColor: "#d9d6cf" },
      })}
      <p className="pointer-events-none absolute bottom-3 left-4 text-small-regular text-ui-fg-subtle">
        3D model from the CAD · drag to turn
      </p>
    </div>
  )
}
