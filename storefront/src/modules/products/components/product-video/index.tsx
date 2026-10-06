import InViewVideo from "./in-view-video"

// A short looping clip for a product (metadata.video: a path without its
// extension, served as .webm and .mp4 -- VP9 first, since Chromium builds
// without licensed codecs cannot play H.264). Muted, so it may play by
// itself, which it does once scrolled near (InViewVideo); with reduced motion
// only its poster shows.
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
        // Lazy: React preloaded it in the <head> otherwise, 109 KB for a
        // picture that shows only with reduced motion (6 Oct 2026).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block"
        />
      )}
      <InViewVideo stem={stem} poster={poster} label={caption} />
      <figcaption className="pointer-events-none absolute bottom-3 left-4 text-small-regular text-white/80">
        {caption}
      </figcaption>
    </figure>
  )
}
