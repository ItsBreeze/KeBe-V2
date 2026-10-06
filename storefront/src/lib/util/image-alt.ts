import { HttpTypes } from "@medusajs/types"

// What each product picture shows, by its path, for screen readers and image
// search; "KeBe v2, picture 3" told neither anything. Written from the
// pictures themselves (5 Oct 2026), and v2's say they are renders, as its
// page does. Medusa's images carry no alt text of their own, so an alt set
// in Admin as the image's metadata.alt wins, and a picture missing here
// falls back to the product's name and its number.
const BY_PATH: Record<string, string> = {
  "/products/kebe-v2-hero.jpg":
    "KeBe v2, rendered from its CAD: black keycaps with white legends on a low black case.",
  "/products/kebe-v2-top.jpg":
    "KeBe v2 from above, rendered from its CAD: 68 keys in straight columns, the Dvorak letters in the middle, the modifiers mirrored on both sides.",
  "/products/kebe-v2-ports.jpg":
    "The back edge of KeBe v2, rendered from its CAD: four USB-C ports, one to the computer and three for its USB 2.0 hub.",
  "/products/kebe-v2-night.jpg":
    "KeBe v2 CAD model on a desk at night, its legends lit in a rainbow by the per-key RGB, in an AI-generated scene.",
  "/products/kebe-v2-studio.jpg":
    "KeBe v2 CAD model on a slab of dark stone, in an AI-generated scene.",
  "/products/kebe-v2-desk.jpg":
    "KeBe v2 CAD model on a wooden desk beside a laptop and a cup of coffee, in an AI-generated scene.",
  "/products/kebe-v1-hero.jpg":
    "KeBe v1 in white, its shine-through legends lit in a rainbow.",
  "/products/kebe-v1-angle.jpg":
    "KeBe v1 from a low angle at one end, the RGB glowing through its switches.",
  "/products/kebe-v1-rgb.jpg":
    "KeBe v1 in white from above, 68 keys in straight columns lit from underneath.",
}

const pathOf = (url: string) => {
  try {
    return new URL(url, "http://kebe.local").pathname
  } catch {
    return url
  }
}

export const productImageAlt = (
  image: Pick<HttpTypes.StoreProductImage, "url" | "metadata">,
  productTitle: string,
  index: number
) => {
  const own = image.metadata?.alt
  if (typeof own === "string" && own.trim()) return own.trim()
  const known = image.url ? BY_PATH[pathOf(image.url)] : undefined
  const name = productTitle.split(" — ")[0] || "KeBe"
  return known ?? `${name}, picture ${index + 1}`
}
