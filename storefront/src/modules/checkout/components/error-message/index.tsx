const ErrorMessage = ({ error, 'data-testid': dataTestid }: { error?: string | null, 'data-testid'?: string }) => {
  if (!error) {
    return null
  }

  // role="alert": a screen reader says the message as it appears (6 Oct
  // 2026). Without it a failed Place order, "do not pay again" included,
  // only gave the button back.
  return (
    <div
      role="alert"
      className="pt-2 text-rose-500 text-small-regular"
      data-testid={dataTestid}
    >
      <span>{error}</span>
    </div>
  )
}

export default ErrorMessage
