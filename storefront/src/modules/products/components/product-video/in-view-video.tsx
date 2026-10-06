"use client"

import { useEffect, useRef } from "react"

// The clip itself. It downloads nothing at load and plays once it is within
// 200 px of the screen, then pauses when it leaves. With autoPlay the 470 KB
// clip started at load, though on a phone it sits below the buy box and
// competed with the page's script for the connection (6 Oct 2026).
export default function InViewVideo({
  stem,
  poster,
  label,
}: {
  stem: string
  poster?: string
  label: string
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    // With reduced motion only the poster shows and no source matches.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        // play() rejects if the browser refuses it; the poster then stays.
        if (e.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { rootMargin: "200px" }
    )
    io.observe(video)
    return () => io.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-label={label}
      className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
      data-testid="product-video"
    >
      {/* media: with reduced motion no source matches, so nothing downloads */}
      <source media="(prefers-reduced-motion: no-preference)" src={`${stem}.webm`} type="video/webm" />
      <source media="(prefers-reduced-motion: no-preference)" src={`${stem}.mp4`} type="video/mp4" />
    </video>
  )
}
