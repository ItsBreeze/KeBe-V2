import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { pageAlternates } from "@lib/data/seo"
import { productImageAlt } from "@lib/util/image-alt"
import {
  SOCIAL_IMAGE,
  listingImageUrls,
  productMetaDescription,
  productSeoTitle,
  socialMetadata,
} from "@lib/util/seo"
import { breadcrumbJsonLd, productJsonLd } from "@lib/util/structured-data"
import JsonLd from "@modules/common/components/json-ld"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return product.images!.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  // The description was the title again; now it is what the board is, then
  // this country's price and its ship date while they fit (lib/util/seo.ts).
  const title = productSeoTitle(product)
  const description = productMetaDescription(product, params.countryCode)
  const alternates = await pageAlternates(
    params.countryCode,
    `/products/${handle}`
  )
  // The link preview is the product's first CAD render or photograph. The
  // thumbnail it used is v2's AI desk scene, which no preview, feed or
  // structured data shows (image-alt.ts).
  const [image] = listingImageUrls(product)

  return {
    // Whole: the brand is already in it.
    title: { absolute: title },
    description,
    alternates,
    ...socialMetadata({
      title,
      description,
      path: `/products/${handle}`,
      countryCode: params.countryCode,
      images: image
        ? [
            {
              url: image,
              alt: productImageAlt({ url: image }, product.title, 0),
            },
          ]
        : [SOCIAL_IMAGE],
    }),
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  // After the check: an unknown handle read .images off undefined first.
  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  // The product and the way to it, for search engines and shopping surfaces,
  // in the HTML itself.
  return (
    <>
      <JsonLd data={productJsonLd(pricedProduct, params.countryCode)} />
      <JsonLd data={breadcrumbJsonLd(params.countryCode, pricedProduct)} />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
      />
    </>
  )
}
