"use client"

import { CONTACT_EMAIL } from "@lib/constants"
import { addToCart, preorderNow } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import { presaleShipLine, presaleShipsBy } from "@lib/util/presale"
import { getPricesForVariant } from "@lib/util/get-product-price"
import { trackPixel, trackPixelCustom } from "@lib/util/meta-pixel"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

// The Pre-order form's id: the sticky bar's button sits outside the form and
// submits it through its form attribute.
const PREORDER_FORM_ID = "preorder-form"

// What a failed add says, with the address to write to instead.
const addErrorText = (lead: string) => (
  <>
    {lead} Try again, or email{" "}
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
    .
  </>
)

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // A single variant is selected from the first render, so the server's HTML
  // already shows the buy button, not "Out of stock" / "Select variant"
  // until hydration (what crawlers and a slow tap from an ad see).
  const [options, setOptions] = useState<Record<string, string | undefined>>(
    () =>
      product.variants?.length === 1
        ? optionsAsKeymap(product.variants[0].options) ?? {}
        : {}
  )
  const [isAdding, setIsAdding] = useState(false)
  const [addFailed, setAddFailed] = useState(false)
  const [state, formAction, pending] = useActionState<
    { error?: boolean } | null,
    FormData
  >(preorderNow, null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    // With one variant, v_id selects nothing: its pictures are the product's.
    // The page is rendered per request, so router.replace rendered every
    // landing a second time on the server, while the phone was still
    // fetching the model and the script (6 Oct 2026).
    if ((product.variants?.length ?? 0) <= 1) return

    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const shipsBy = presaleShipsBy(product)
  const shipLine = presaleShipLine(product)
  const buyLabel = shipsBy ? "Pre-order" : "Add to cart"

  // The sticky bar shows while the inline button is not all on screen. It
  // watched the whole price, button and note block, and any pixel of that
  // counted, so at 375 x 650 a 12 px sliver of the button hid the bar
  // (6 Oct 2026). It starts as seen, so the server's HTML has no bar over
  // the presale note before the page's script has loaded.
  const buttonRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(buttonRef, "0px", {
    full: true,
    initial: true,
  })

  // A failed pre-order is a PreorderError to the pixel. It carries the
  // product only: never the error, the cart or anything the visitor typed.
  useEffect(() => {
    if (state?.error) {
      trackPixelCustom("PreorderError", { content_ids: [product.id] })
    }
  }, [state, product.id])

  // Add the selected variant to the cart. This is for products without a
  // presale: Pre-order is a form (preorderNow), which posts even before this
  // script has loaded. A pre-order is one board: the cart holds exactly one,
  // and the visitor goes straight to checkout. Checkout counts its AddToCart.
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)
    setAddFailed(false)

    // A failed add left the button spinning with nothing said.
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
    } catch {
      setIsAdding(false)
      setAddFailed(true)
      return null
    }

    const price = getPricesForVariant(selectedVariant)
    trackPixel("AddToCart", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.title,
      value: price?.calculated_price_number,
      currency: price?.currency_code?.toUpperCase(),
    })

    setIsAdding(false)
  }

  // The presale's button waits on the form, the others on handleAddToCart.
  const busy = shipsBy ? pending : isAdding
  // Hidden while a retry is under way, so a second failure shows afresh.
  const addError = shipsBy
    ? state?.error && !pending
      ? addErrorText("We couldn't start your pre-order.")
      : null
    : addFailed
    ? addErrorText("We couldn't add it to your cart.")
    : null

  // Wrapped for buttonRef, in the form or not, so the bar follows the
  // button on products without a presale too.
  const buyButton = (
    <div ref={buttonRef}>
      <Button
        type={shipsBy ? "submit" : undefined}
        onClick={shipsBy ? undefined : handleAddToCart}
        disabled={
          !inStock || !selectedVariant || !!disabled || busy || !isValidVariant
        }
        variant="primary"
        className="w-full h-12 text-base"
        isLoading={busy}
        data-testid="add-product-button"
      >
        {!selectedVariant && !options
          ? "Select variant"
          : !inStock || !isValidVariant
          ? "Out of stock"
          : buyLabel}
      </Button>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || busy}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {/* Pre-order is a form posted to preorderNow: the server's HTML
            posts it before the page's script has loaded, which on a phone
            from an ad can take a while. The Suspense fallback renders it
            too, with the button disabled. */}
        {shipsBy ? (
          <form
            id={PREORDER_FORM_ID}
            action={formAction}
            onSubmit={() =>
              trackPixelCustom("PreorderTap", {
                content_ids: [product.id],
                content_type: "product",
              })
            }
          >
            <input
              type="hidden"
              name="variant_id"
              value={selectedVariant?.id ?? ""}
            />
            <input type="hidden" name="country_code" value={countryCode} />
            {buyButton}
          </form>
        ) : (
          buyButton
        )}
        {addError && (
          <p
            role="alert"
            className="text-base text-rose-400"
            data-testid="add-error"
          >
            {addError}
          </p>
        )}
        {shipsBy && inStock && (
          <p
            className="text-base leading-relaxed text-ui-fg-muted"
            data-testid="presale-note"
          >
            Pre-order: plus shipping, calculated at checkout, and charged in
            full there.{" "}
            {shipLine ? `${shipLine}, to Canada and the US.` : "Ships to Canada and the US."}
          </p>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          formId={shipsBy ? PREORDER_FORM_ID : undefined}
          buyLabel={buyLabel}
          isAdding={isAdding}
          pending={pending}
          addError={addError}
          show={!inView}
          optionsDisabled={!!disabled || busy}
        />
      </div>
    </>
  )
}
