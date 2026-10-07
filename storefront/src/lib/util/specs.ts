import { HttpTypes } from "@medusajs/types"
import { LITE_HANDLE, PRESALE_HANDLE } from "@lib/util/presale"

export type Spec = { label: string; value: string }

// The presale board's specification, from the kebe repo's v3 sources
// (PCBs/v3/README.md, Case_Files/v3/README.md, Keycaps/README.md) and the paid
// parts orders. Medusa's own fields (weight, dimensions, material) are empty
// for it, and the starter's tab showed a column of dashes. Nothing here may
// promise a battery or a radio: this board is wired, and since 6 Oct 2026 the
// list says so, as the homepage does ("v2 is wired"), so the product page,
// its structured data, the feeds and llms.txt can too.
const BY_HANDLE: Record<string, Spec[]> = {
  [PRESALE_HANDLE]: [
    { label: "Layout", value: "68 keys, ortholinear, Matrix-Dvorak" },
    { label: "Switches", value: "Kailh Choc v1 Brown, low-profile tactile" },
    { label: "Sockets", value: "Hot-swap: change switches without solder" },
    { label: "Keycaps", value: "Black, with shine-through legends" },
    { label: "Lighting", value: "Per-key RGB, 68 SK6812MINI-E LEDs" },
    { label: "Connection", value: "Wired, USB-C" },
    { label: "Ports", value: "4 × USB-C: 1 to the computer, 3 as a USB 2.0 hub" },
    { label: "Controller", value: "STM32F072, running QMK" },
    { label: "Case", value: "Black-dyed nylon, screwless snap-fit" },
    { label: "Plate", value: "FR4, black soldermask" },
    { label: "Case size", value: "256.7 × 89.2 × 8.65 mm" },
    { label: "Assembly", value: "By hand in Canada" },
  ],
  // KeBe Lite, from the kebe repo's PCBs/lite/README.md (rev 2, 7 Oct 2026: no top plate; the stack, the keypad and the case) and keypad/RFQ.md (the
  // backlit finish); the case is KeBe v2's r9, printed in natural-grey MJF PA12 for the Lite (the README's cost
  // section). Wired, like v2. No switches or keycaps: the keys are one silicone keypad.
  [LITE_HANDLE]: [
    { label: "Layout", value: "68 keys, ortholinear, Matrix-Dvorak" },
    { label: "Keys", value: "One silicone keypad: rubber domes with carbon contacts on gold pads" },
    { label: "Legends", value: "Backlit, laser-etched through black-sprayed translucent silicone" },
    { label: "Lighting", value: "Per-key RGB, 68 SK6812MINI-E LEDs" },
    { label: "Connection", value: "Wired, USB-C" },
    { label: "Ports", value: "4 × USB-C: 1 to the computer, 3 as a USB 2.0 hub" },
    { label: "Controller", value: "STM32F072, running QMK" },
    { label: "Case", value: "Grey nylon, screwless snap-fit: KeBe v2's case" },
    { label: "Top plate", value: "None: the keypad covers the board edge to edge" },
    { label: "Size", value: "256.7 × 89.2 mm, 10.95 mm to the key tops" },
    { label: "Assembly", value: "By hand in Canada" },
  ],
}

// Medusa's product fields, for products that have them.
const fromFields = (p: HttpTypes.StoreProduct): Spec[] =>
  [
    p.material && { label: "Material", value: p.material },
    p.weight && { label: "Weight", value: `${p.weight} g` },
    p.length &&
      p.width &&
      p.height && {
        label: "Dimensions",
        value: `${p.length} × ${p.width} × ${p.height} mm`,
      },
    p.origin_country && { label: "Made in", value: p.origin_country },
  ].filter(Boolean) as Spec[]

export const productSpecs = (product: HttpTypes.StoreProduct): Spec[] =>
  (product.handle && BY_HANDLE[product.handle]) || fromFields(product)
