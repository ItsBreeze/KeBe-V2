// What a tap on Go to checkout shows while the cart, the delivery options and
// the payment methods load (6 Oct 2026). Before, the page gave no sign of the
// tap until it was ready.
export default function Loading() {
  return (
    <div
      className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12"
      role="status"
      aria-label="Loading checkout"
      data-testid="checkout-loading"
    >
      <div className="flex flex-col gap-y-6">
        <div className="h-10 w-1/2 rounded-md bg-ui-bg-component animate-pulse" />
        <div className="h-12 w-full rounded-md bg-ui-bg-component animate-pulse" />
        <div className="h-12 w-full rounded-md bg-ui-bg-component animate-pulse" />
      </div>
    </div>
  )
}
