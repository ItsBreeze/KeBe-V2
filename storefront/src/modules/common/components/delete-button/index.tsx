import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useState } from "react"

// What a failed change to a cart line says, here and in the cart's quantity
// select.
export const QUANTITY_ERROR =
  "Could not change the quantity. Reload the page and try again."

// onError hands a failure to the parent to show, as the cart's row does under
// its quantity. Without it, the message shows under the button.
const DeleteButton = ({
  id,
  children,
  className,
  onError,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  onError?: (error: string | null) => void
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = onError ?? setError

  const handleDelete = async (id: string) => {
    showError(null)
    setIsDeleting(true)

    // The action returns its failure; a dropped connection throws here.
    // Once the line is gone the button goes with it, so only a failure
    // turns the spinner off.
    try {
      const res = await deleteLineItem(id)

      if (res?.error) {
        setIsDeleting(false)
        showError(QUANTITY_ERROR)
      }
    } catch {
      setIsDeleting(false)
      showError(QUANTITY_ERROR)
    }
  }

  return (
    <>
      <div
        className={clx(
          "flex items-center justify-between text-small-regular",
          className
        )}
      >
        <button
          className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
          onClick={() => handleDelete(id)}
        >
          {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
          <span>{children}</span>
        </button>
      </div>
      {!onError && (
        <ErrorMessage error={error} data-testid="delete-error-message" />
      )}
    </>
  )
}

export default DeleteButton
