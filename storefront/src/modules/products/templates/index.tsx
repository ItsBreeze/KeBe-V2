import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductModel from "@modules/products/components/product-model"
import ProductVideo from "@modules/products/components/product-video"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { productSpecs } from "@lib/util/specs"
import { getProductPrice } from "@lib/util/get-product-price"
import PixelEvent from "@modules/common/components/meta-pixel/pixel-event"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

// Layout: the 3D model (or the first picture) beside the buy box, the clip
// and pictures in a grid under them, then the description with the
// specification and shipping beside it. The starter's three columns put a
// narrow run of description on the far left and the button on the far right.
const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  // A product with a 3D model (metadata.model_glb) or a clip (metadata.video,
  // a path without extension), both set by the backend's start-presale
  // script, shows them first.
  const model =
    typeof product.metadata?.model_glb === "string"
      ? product.metadata.model_glb
      : null
  const video =
    typeof product.metadata?.video === "string" ? product.metadata.video : null
  // The viewer's poster is the lit still render-v2 makes beside each model
  // (<model>-glow.jpg), so the poster and the lit model match. The backend's
  // model_poster is a daylight render on a pale ground, which flashed white.
  const modelPoster = model ? model.replace(/\.glb$/, "-glow.jpg") : undefined

  // Without a model the first picture leads, and the grid shows the rest.
  const lead = model ? null : images[0]
  const gallery = model ? images : images.slice(1)
  // The buy box repeats the four facts that sell it; the full list is below.
  const highlights = productSpecs(product).filter((s) =>
    ["Ports", "Switches", "Lighting", "Layout"].includes(s.label)
  )
  const paragraphs = (product.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const { cheapestPrice } = getProductPrice({ product })

  return (
    <div data-testid="product-container">
      <PixelEvent
        event="ViewContent"
        params={{
          content_ids: [product.id],
          content_type: "product",
          content_name: product.title,
          value: cheapestPrice?.calculated_price_number,
          currency: (
            cheapestPrice?.currency_code ?? region.currency_code
          ).toUpperCase(),
        }}
      />
      <section className="content-container pt-6 pb-12 small:pt-10 small:pb-16">
        <div className="grid grid-cols-1 gap-8 small:grid-cols-12 small:items-center small:gap-14">
          <div className="small:col-span-7">
            {model ? (
              <ProductModel
                src={model}
                poster={modelPoster}
                alt={`${product.title}, a 3D model you can turn`}
                eager
                className="aspect-[4/3]"
              />
            ) : lead?.url ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-kebe-line bg-kebe-raised">
                <Image
                  src={lead.url}
                  alt={product.title ?? ""}
                  priority
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-8 small:col-span-5">
            <ProductInfo product={product} />
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
            {highlights.length > 0 && (
              <ul className="flex flex-col divide-y divide-ui-border-base border-y border-ui-border-base text-base text-ui-fg-subtle">
                {highlights.map((h) => (
                  <li key={h.label} className="flex justify-between gap-6 py-3">
                    <span className="text-ui-fg-muted">{h.label}</span>
                    <span className="text-right">{h.value}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Every KeBe has the same layout, so every product page points
                at the trainer that teaches it. */}
            <p className="text-base text-ui-fg-subtle">
              New to Dvorak?{" "}
              <LocalizedClientLink
                href="/train"
                className="text-ui-fg-base underline underline-offset-4 hover:text-white"
              >
                Learn the layout
              </LocalizedClientLink>{" "}
              with the typing trainer, before your board arrives.
            </p>
          </div>
        </div>
      </section>

      {(video || gallery.length > 0) && (
        <section className="content-container pb-16 small:pb-24">
          <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
            {video && (
              <div className="small:col-span-2">
                <ProductVideo
                  stem={video}
                  poster={`${video}.jpg`}
                  caption="The CAD model in an AI-generated scene"
                  className="aspect-[16/9]"
                />
              </div>
            )}
            <ImageGallery images={gallery} title={product.title ?? ""} />
          </div>
        </section>
      )}

      <section className="border-t border-ui-border-base">
        <div className="content-container grid grid-cols-1 gap-12 py-16 small:py-24 small:grid-cols-12 small:gap-16">
          {paragraphs.length > 0 && (
            <div className="small:col-span-7">
              <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] text-ui-fg-base">
                About the board
              </h2>
              <div
                className="mt-6 flex max-w-2xl flex-col gap-5 text-lg leading-relaxed text-ui-fg-subtle"
                data-testid="product-description"
              >
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}
          <div className={paragraphs.length > 0 ? "small:col-span-5" : "small:col-span-12"}>
            <ProductTabs product={product} />
          </div>
        </div>
      </section>

      <div
        className="content-container pb-16 small:pb-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default ProductTemplate
