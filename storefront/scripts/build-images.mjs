// Generates web derivatives for the KeBe storefront from the source photo
// library. Sources live outside this repo (the KeBe hardware project); only the
// generated output is committed, so the storefront stays self-contained and the
// 19 MB originals never enter git.
//
//   node scripts/build-images.mjs
//
// Override the source root with KEBE_IMAGES if the project moves.

import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SRC =
  process.env.KEBE_IMAGES ??
  "C:/Users/brise/OneDrive/Documents/Projects/KeBe/Images";
const OUT = path.join(process.cwd(), "public", "products");

const WIDTHS = [400, 800, 1600, 2400];

// Hand-picked. Everything not listed here is excluded on purpose: the
// root-folder alpha PNGs have the case cut away along with the background, the
// forest composites have no contact shadow and read as fake, and Images/Smaller
// is the same 4032x3024 pixels just palette-quantised.
const SOURCES = [
  {
    src: "Backdropped/20240804_224926368_iOS.png",
    name: "kebe-v1-hero",
    alt: "A KeBe v1 keyboard seen straight on, its 68 white keycaps laid out on a regular grid.",
  },
  {
    src: "Backdropped/20240804_225556079_iOS.png",
    name: "kebe-v1-angle",
    alt: "A KeBe v1 keyboard at a three-quarter angle with its per-key RGB lighting on.",
  },
  {
    src: "Backdropped/20240804_225421998_iOS.png",
    name: "kebe-v1-rgb",
    alt: "A KeBe v1 keyboard photographed low and close, RGB backlighting glowing beneath the keycaps.",
  },
  {
    src: "Backdropped/20240804_225430187_iOS.png",
    name: "kebe-v1-front",
    alt: "The front edge of a KeBe v1 keyboard, underglow spilling onto the desk.",
  },
  {
    src: "Backdropped/20240804_224944193_iOS.png",
    name: "kebe-v1-case",
    alt: "Close view of the KeBe v1 case profile and the low-profile switches under the keycaps.",
  },
  {
    src: "Backdropped/20240804_225209309_iOS.png",
    name: "kebe-v1-usbc",
    alt: "The USB-C cable connected to the KeBe v1 keyboard.",
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const manifest = {};
  let written = 0;

  for (const { src, name, alt } of SOURCES) {
    const input = path.join(SRC, src);
    const meta = await sharp(input).metadata();

    for (const w of WIDTHS) {
      if (w > meta.width) continue;
      const base = sharp(input).resize(w, null, { withoutEnlargement: true });

      await base
        .clone()
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(OUT, `${name}-${w}.jpg`));
      await base
        .clone()
        .webp({ quality: 80 })
        .toFile(path.join(OUT, `${name}-${w}.webp`));
      await base
        .clone()
        .avif({ quality: 55 })
        .toFile(path.join(OUT, `${name}-${w}.avif`));
      written += 3;
    }

    // Stable default that product records and og:image point at.
    await sharp(input)
      .resize(1600, null, { withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT, `${name}.jpg`));
    written += 1;

    manifest[name] = { alt, widths: WIDTHS.filter((w) => w <= meta.width) };
  }

  // Social card, 1200x630, cropped from the hero.
  await sharp(path.join(SRC, SOURCES[0].src))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(OUT, "og-image.jpg"));
  written += 1;

  const files = await readdir(OUT);
  console.log(`wrote ${written} files to public/products (${files.length} total)`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
