// A short looping clip for a product (metadata.video: a path without its
// extension, served as .webm and .mp4 -- VP9 first, since Chromium builds
// without licensed codecs cannot play H.264). Muted, so it may autoplay; with
// reduced motion only its poster shows.
export default function ProductVideo({
  stem,
  poster,
  caption,
  className = "aspect-[4/3]",
}: {
  stem: string
  poster?: string
  caption: string
  className?: string
}) {
  return (
    <figure className={`relative w-full overflow-hidden rounded-2xl border border-kebe-line bg-kebe-raised ${className}`}>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block"
        />
      )}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={caption}
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        data-testid="product-video"
      >
        {/* media: with reduced motion no source matches, so nothing downloads */}
        <source media="(prefers-reduced-motion: no-preference)" src={`${stem}.webm`} type="video/webm" />
        <source media="(prefers-reduced-motion: no-preference)" src={`${stem}.mp4`} type="video/mp4" />
      </video>
      <figcaption className="pointer-events-none absolute bottom-3 left-4 text-small-regular text-white/80">
        {caption}
      </figcaption>
    </figure>
  )
}
