import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductModel from "@modules/products/components/product-model"
import ProductVideo from "@modules/products/components/product-video"
import ProductActions from "@modules/products/components/product-actions"
import BuyBoxBoundary from "@modules/products/components/product-actions/buy-box-boundary"
import ProductTabs from "@modules/products/components/product-tabs"
import ProductQuestions from "@modules/products/components/product-questions"
import BeforeYouPreorder from "@modules/products/components/before-you-preorder"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { productSpecs } from "@lib/util/specs"
import { productImageAlt } from "@lib/util/image-alt"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  LITE_HANDLE,
  PRESALE_HANDLE,
  presaleAvailability,
  presaleShipsBy,
} from "@lib/util/presale"
import { BUYBOX_REASONS } from "@lib/util/kebe-copy"
import { listProducts } from "@lib/data/products"
import PixelEvent from "@modules/common/components/meta-pixel/pixel-event"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import ProductActionsWrapper from "./product-actions-wrapper"

// v1's line pointing at v2, said only while v2 is on pre-order and can be
// bought (6 Oct 2026). Once v2's pre-orders close as well, or it is sold
// without a ship date, the line is left out rather than send the visitor to
// another page that cannot sell them a board. A failed read leaves it out
// too. It is the cached product read, which the backend refreshes when stock
// moves.
async function V2OnPreorder({ regionId }: { regionId: string }) {
  const v2 = await listProducts({
    regionId,
    queryParams: { handle: PRESALE_HANDLE, limit: 1 },
  })
    .then(({ response }) => response.products[0])
    .catch(() => undefined)

  if (!v2 || !presaleShipsBy(v2) || !presaleAvailability(v2).open) {
    return null
  }

  return (
    <p className="text-base text-ui-fg-subtle">
      v1 is sold out. KeBe v2 is on pre-order.{" "}
      <LocalizedClientLink
        href={`/products/${PRESALE_HANDLE}`}
        className="whitespace-nowrap text-ui-fg-base underline underline-offset-4 hover:text-white"
      >
        See KeBe v2
      </LocalizedClientLink>
    </p>
  )
}

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
  // The name without the title's description, as the pictures' alt text has
  // it: "KeBe v2".
  const productName = (product.title ?? "").split(" — ")[0] || "KeBe"

  // Without a model the first picture leads, and the grid shows the rest.
  const lead = model ? null : images[0]
  const gallery = model ? images : images.slice(1)
  // The buy box repeats the four facts that sell it; the full list is below.
  const specs = productSpecs(product)
  const highlights = specs.filter((s) =>
    ["Ports", "Switches", "Lighting", "Layout"].includes(s.label)
  )
  // On the presale board the reasons for the layout take the highlights'
  // place, the argument the reel and the ad make, and the same four facts
  // shrink to one line after them (6 Oct 2026).
  const shipsBy = presaleShipsBy(product)
  // v1's page, once it cannot be bought, points at the board that can,
  // rather than ending at a disabled button (6 Oct 2026). The handle check
  // keeps the line off v2's own page should its presale ever end, and
  // V2OnPreorder says it only while v2 can be pre-ordered.
  const soldOutToV2 =
    !shipsBy &&
    product.handle !== PRESALE_HANDLE &&
    !presaleAvailability(product).open
  const alsoFacts = ["Layout", "Ports", "Switches", "Lighting"]
    .map((label) => specs.find((s) => s.label === label)?.value)
    .filter((v): v is string => !!v)
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
        {/* On a wide screen the buy box is taller than the model, so the
            two align at the top and the model column stays in view while
            the buy box scrolls. Centred, the model sank as the buy box grew
            (6 Oct 2026). */}
        <div className="grid grid-cols-1 gap-8 small:grid-cols-12 small:items-start small:gap-14">
          <div className="small:col-span-7 small:sticky small:top-20 small:self-start">
            {/* On a phone the model is 16/10, about 40 px shorter than 4/3
                at 375 wide, so at 375 x 650 (an Instagram ad's screen) the
                whole Pre-order button is on screen at landing (6 Oct 2026).
                Anything added above the button has to replace text, not
                add to it. fitRadius frames the board to whichever box. */}
            {model ? (
              <ProductModel
                src={model}
                poster={modelPoster}
                alt={`${product.title}, a 3D model you can turn`}
                posterFirst
                posterAlt={`${productName}, rendered from its CAD`}
                eager
                className="aspect-[16/10] small:aspect-[4/3]"
              />
            ) : lead?.url ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-kebe-line bg-kebe-raised">
                <Image
                  src={lead.url}
                  alt={productImageAlt(lead, product.title ?? "", 0)}
                  priority
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-8 small:col-span-5">
            <ProductInfo product={product} countryCode={countryCode} />
            <BuyBoxBoundary productId={product.id} preorder={!!shipsBy}>
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
            </BuyBoxBoundary>
            {soldOutToV2 && (
              <Suspense fallback={null}>
                <V2OnPreorder regionId={region.id} />
              </Suspense>
            )}
            {/* The presale's short answers, directly under the button and
                its note; nothing on other products. */}
            <BeforeYouPreorder product={product} countryCode={countryCode} />
            {shipsBy ? (
              <section
                aria-labelledby="why-keys"
                className="flex flex-col gap-4"
              >
                <h2
                  id="why-keys"
                  className="font-display text-xl text-ui-fg-base"
                >
                  Why the keys are where they are
                </h2>
                <ul className="flex flex-col divide-y divide-ui-border-base border-y border-ui-border-base">
                  {BUYBOX_REASONS.map((r) => (
                    <li key={r.title} className="py-3">
                      <p className="text-base text-ui-fg-base">{r.title}</p>
                      <p className="mt-1 text-base leading-relaxed text-ui-fg-subtle">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>
                {alsoFacts.length > 0 && (
                  <p className="text-base leading-relaxed text-ui-fg-subtle">
                    Also: {alsoFacts.join(" · ")}.{" "}
                    {/* A plain link: LocalizedClientLink would prefix the
                        country and leave the page for the homepage. */}
                    <a
                      href="#specifications"
                      className="whitespace-nowrap text-ui-fg-base underline underline-offset-4 hover:text-white"
                    >
                      Full specifications
                    </a>
                  </p>
                )}
              </section>
            ) : (
              highlights.length > 0 && (
                <ul className="flex flex-col divide-y divide-ui-border-base border-y border-ui-border-base text-base text-ui-fg-subtle">
                  {highlights.map((h) => (
                    <li key={h.label} className="flex justify-between gap-6 py-3">
                      <span className="text-ui-fg-muted">{h.label}</span>
                      <span className="text-right">{h.value}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
            {/* Every KeBe has the same layout, so every product page points
                at the trainer: v2 from Before you pre-order, v1 here
                (6 Oct 2026). */}
            {!shipsBy && (
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
            )}
          </div>
        </div>
      </section>

      {(video || gallery.length > 0) && (
        <section className="content-container pb-16 small:pb-24">
          {/* On a pre-order board a line above the pictures says what they
              are, none of them a photograph. It is the disclosure that ends
              the description, set where the pictures start, in the clip
              caption's style (6 Oct 2026). KeBe Lite's are plain renders of
              its design files (storefront/scripts/render-lite), with no AI
              scenes (7 Oct 2026). */}
          {shipsBy && product.handle === LITE_HANDLE && (
            <p className="mb-3 text-small-regular text-white/80">
              None of the KeBe Lite pictures here are photographs: they and
              the 3D model are renders of the Lite&apos;s design files.
            </p>
          )}
          {shipsBy && product.handle !== LITE_HANDLE && (
            <p className="mb-3 text-small-regular text-white/80">
              None of the v2 pictures here are photographs: the plain renders
              and the 3D model come straight from v2&apos;s CAD, and the desk,
              studio and night pictures and the clip set that CAD model in
              AI-generated scenes.
            </p>
          )}
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
            {/* With the model leading, no picture is on the first screen,
                so none is preloaded. */}
            <ImageGallery
              images={gallery}
              title={product.title ?? ""}
              priorityCount={model ? 0 : undefined}
            />
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
            <ProductTabs product={product} countryCode={countryCode} />
          </div>
        </div>
      </section>

      <ProductQuestions product={product} />

      {/* No "Also from KeBe" on the presale board: its one card was v1,
          sold out and at a lower price, a way off the page at its end.
          v1's page still shows v2 here (6 Oct 2026). */}
      {!shipsBy && (
        <div
          className="content-container pb-16 small:pb-32"
          data-testid="related-products-container"
        >
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts product={product} countryCode={countryCode} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

export default ProductTemplate
