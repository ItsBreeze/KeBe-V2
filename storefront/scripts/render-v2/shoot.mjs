// Renders the KeBe v2 product pictures from the hardware project's CAD, so the
// store shows the board that ships rather than v1 photos:
//
//   KEBE_ROOT=<kebe repo on its kebe-v2 branch> node scripts/render-v2/shoot.mjs
//
// Reads Case_Files/v3/KEBE-V3-BOTTOM.stl (the printed case as ordered),
// Keycaps/print/per-cap/*.svg (each cap's printed legend) and
// Keycaps/print/kebe-legend-list.csv (cap sizes and positions), renders
// index.html in headless Chromium, and writes
// public/products/kebe-v2-{hero,ports,top,glow}.jpg at 2400 x 1800.
//
// Needs Playwright with its Chromium (npm i -g playwright && npx playwright
// install chromium; NODE_PATH pointing at the global modules) and network
// access for three.js from jsDelivr (or three@0.170.0 installed where NODE_PATH
// finds it). Software WebGL is fine: each view takes a few seconds.

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", "public", "products");
const ROOT =
  process.env.KEBE_ROOT ?? "C:/Users/brise/OneDrive/Documents/Projects/KeBe";
const VIEWS = ["hero", "ports", "top", "glow"];
const W = 2400, H = 1800;

// The legend list quotes fields that contain commas.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^\uFEFF/, ""), r[i]])));
}

async function stage() {
  const dir = await mkdtemp(path.join(tmpdir(), "kebe-render-"));
  await mkdir(path.join(dir, "assets", "caps"), { recursive: true });
  await copyFile(path.join(ROOT, "Case_Files/v3/KEBE-V3-BOTTOM.stl"), path.join(dir, "assets/KEBE-V3-BOTTOM.stl"));
  const caps = path.join(ROOT, "Keycaps/print/per-cap");
  for (const f of await readdir(caps)) {
    if (f.endsWith(".svg")) await copyFile(path.join(caps, f), path.join(dir, "assets/caps", f));
  }
  const keys = parseCsv(await readFile(path.join(ROOT, "Keycaps/print/kebe-legend-list.csv"), "utf8")).map((r) => {
    const [w, d] = r["Cap W x D (mm)"].split(" x ").map(Number);
    return { ref: r.Designator, w, d, dx: +r["X from CH1 (mm)"], dy: +r["Y from CH1 (mm)"], svg: !!r["Per-cap SVG"] };
  });
  if (keys.length !== 68) throw new Error(`expected 68 keys in the legend list, found ${keys.length}`);
  await writeFile(path.join(dir, "assets/keys.json"), JSON.stringify(keys));
  await copyFile(path.join(HERE, "index.html"), path.join(dir, "index.html"));
  return dir;
}

const TYPES = { ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml" };

const dir = await stage();
const server = createServer(async (req, res) => {
  try {
    const p = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    const body = await readFile(p);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const port = server.address().port;

// require, not import: NODE_PATH reaches a global Playwright only through it.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// A local three@0.170.0 (e.g. on NODE_PATH) stands in for jsDelivr, for
// machines whose browser cannot reach the CDN.
const CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0";
let localThree = null;
try {
  // three does not export its package.json; its main entry is build/three.cjs.
  const dir = path.resolve(path.dirname(require.resolve("three")), "..");
  const { version } = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  if (version === "0.170.0") localThree = dir;
} catch {}
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await mkdir(OUT, { recursive: true });
try {
  for (const view of VIEWS) {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    page.on("pageerror", (e) => console.error(`${view}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && console.error(`${view}: ${m.text()}`));
    page.on("requestfailed", (r) => console.error(`${view}: could not load ${r.url()}`));
    if (localThree) {
      await page.route(`${CDN}/**`, (route) =>
        route.fulfill({ path: path.join(localThree, route.request().url().slice(CDN.length)) })
      );
    }
    await page.goto(`http://localhost:${port}/index.html?view=${view}&w=${W}&h=${H}`);
    await page.waitForFunction("window.__done === true", null, { timeout: 120000 });
    const png = await page.locator("canvas").screenshot();
    const out = path.join(OUT, `kebe-v2-${view}.jpg`);
    await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
