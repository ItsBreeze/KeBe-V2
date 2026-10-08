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
    { label: "Switches", value: "Kailh Choc v1 Brown: low-profile, tactile mechanical switches" },
    { label: "Sockets", value: "Hot-swap: change switches without solder" },
    { label: "Keycaps", value: "Black-coated, with laser-engraved shine-through legends (the two 2U thumb keys plain)" },
    { label: "Lighting", value: "Per-key RGB, 68 SK6812MINI-E LEDs" },
    { label: "Connection", value: "Wired, USB-C" },
    { label: "Ports", value: "4 × USB-C: 1 to the computer, 3 as a USB 2.0 hub" },
    { label: "Controller", value: "STM32F072, running QMK" },
    { label: "Case", value: "Black-dyed nylon, screwless snap-fit" },
    { label: "Plate", value: "FR4, black soldermask" },
    { label: "Case size", value: "256.7 × 89.2 × 8.65 mm: the case; the switches and keycaps stand above it" },
    { label: "Assembly", value: "By hand in Canada" },
  ],
  // KeBe Lite, from the kebe repo's PCBs/lite/README.md (rev 2, 7 Oct 2026: no top plate; the stack, the keypad and the case) and keypad/RFQ.md (the
  // backlit finish); the case is KeBe v2's r9 cut flush with the keypad, printed in black SLS 3201PA-F nylon for the Lite (the README's cost
  // section). Wired, like v2. No separate switches or keycaps: the keys are one P+R keypad (rev 3, owner 7 Oct 2026:
  // hard plastic caps bonded on silicone rubber domes), in the Lite case (PCBs/lite/case: v2's case, rim flush with it).
  [LITE_HANDLE]: [
    { label: "Layout", value: "68 keys, ortholinear, Matrix-Dvorak" },
    { label: "Keys", value: "Membrane: hard plastic key tops on rubber domes, each dome's carbon contact closing gold pads on the board" },
    { label: "Legends", value: "Shine-through: laser-etched through black-painted translucent key tops" },
    { label: "Lighting", value: "Per-key RGB, 68 SK6812MINI-E LEDs" },
    { label: "Connection", value: "Wired, USB-C" },
    { label: "Ports", value: "4 × USB-C: 1 to the computer, 3 as a USB 2.0 hub" },
    { label: "Controller", value: "STM32F072, running QMK" },
    { label: "Case", value: "Black nylon, screwless snap-fit: KeBe v2's case, cut down flush with the keypad" },
    { label: "Top plate", value: "None: the keypad covers the board edge to edge" },
    { label: "Size", value: "Slim: 256.7 × 89.2 mm, 10.95 mm from the case's underside to the key tops (before feet)" },
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
