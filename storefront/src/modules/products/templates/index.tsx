import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductModel from "@modules/products/components/product-model"
import ProductVideo from "@modules/products/components/product-video"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

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
  // script, shows them above its pictures.
  const model =
    typeof product.metadata?.model_glb === "string"
      ? product.metadata.model_glb
      : null
  const video =
    typeof product.metadata?.video === "string" ? product.metadata.video : null
  // The viewer's poster is a plain render (metadata.model_poster), not the
  // first gallery picture, which may be a composite scene.
  const modelPoster =
    typeof product.metadata?.model_poster === "string"
      ? product.metadata.model_poster
      : images[0]?.url

  return (
    <>
      <div
        className="content-container  flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} />
          <ProductTabs product={product} />
        </div>
        <div className="block w-full relative">
          {model && (
            <div className="mb-4 small:mx-16">
              <ProductModel
                src={model}
                poster={modelPoster}
                alt={`${product.title}, a 3D model you can turn`}
              />
            </div>
          )}
          {video && (
            <div className="mb-4 small:mx-16">
              <ProductVideo
                stem={video}
                poster={`${video}.jpg`}
                caption="The CAD model in an AI-generated scene"
              />
            </div>
          )}
          <ImageGallery images={images} />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <ProductOnboardingCta />
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
        </div>
      </div>
      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
