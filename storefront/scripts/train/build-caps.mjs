// Packs KeBe's 66 printed keycap legends into one SVG sprite for the typing
// trainer's board (public/train/caps.svg, one <symbol id="CH<n>"> per cap).
// The art is the same per-cap file the laser engraves, generated from the
// firmware's keymap.c by the kebe repo's scripts/make_keycap_print_jig.py, so
// the trainer's caps read exactly like the real ones. Re-run after any keymap
// or legend change there:
//
//   node scripts/train/build-caps.mjs [path/to/kebe/Keycaps/print/per-cap]
//
// The fill is stripped so each cap takes the colour of its <use> (currentColor).
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { homedir } from "node:os"

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, "..", "..", "public", "train", "caps.svg")
const src =
  process.argv[2] ??
  [
    join(homedir(), "Code", "KeBe", "Keycaps", "print", "per-cap"),
    join(homedir(), "OneDrive", "Documents", "Projects", "KeBe", "Keycaps", "print", "per-cap"),
  ].find((p) => {
    try {
      return readdirSync(p).length > 0
    } catch {
      return false
    }
  })
if (!src) throw new Error("per-cap folder not found; pass its path")

const files = readdirSync(src)
  .filter((f) => /^CH\d+\.svg$/.test(f))
  .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)))
const symbols = files.map((f) => {
  const svg = readFileSync(join(src, f), "utf8")
  const id = f.replace(/\.svg$/, "")
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]
  const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((m) => m[1])
  if (!viewBox || paths.length === 0) throw new Error(`${f}: no viewBox or path`)
  return `<symbol id="${id}" viewBox="${viewBox}">${paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</symbol>`
})
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`
)
console.log(`${files.length} caps from ${src} -> ${out}`)
