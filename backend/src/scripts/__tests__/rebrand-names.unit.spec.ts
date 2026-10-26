import { DESCRIPTIONS, rename } from "../rebrand-names";

describe("rebrand-names", () => {
  it("renames the model, keeps the rest of the title, and leaves new names alone", () => {
    expect(rename("KeBe v2 — Mechanical 68-Key Ortholinear Keyboard with USB Hub")).toBe(
      "Breeze Board — Mechanical 68-Key Ortholinear Keyboard with USB Hub"
    );
    expect(rename("KeBe Lite — Slim Membrane 68-Key Ortholinear Keyboard")).toBe(
      "Breeze Board Lite — Slim Membrane 68-Key Ortholinear Keyboard"
    );
    expect(rename("Breeze Board Lite — x")).toBe("Breeze Board Lite — x");
    expect(rename("Gift Card")).toBe("Gift Card");
  });

  it("writes descriptions that no longer say KeBe", () => {
    for (const d of Object.values(DESCRIPTIONS)) expect(d).not.toMatch(/KeBe/);
  });
});
