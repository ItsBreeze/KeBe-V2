// Renders the KeBe Lite product pictures and 3D model from the hardware project's design files, so the store shows
// the board as drawn (there is no Lite to photograph yet):
//
//   KEBE_ROOT=<kebe repo> node scripts/render-lite/shoot.mjs [stills] [glb]
//
// (no arguments = both)
//
// Reads PCBs/lite/viewer/assets/lite.json and legends.svg (written by the kebe repo's PCBs/lite/tools/lite_viewer.py
// from the Lite's board, keypad drawing and the v3 case report) and PCBs/lite/case/KEBE-LITE-CASE.stl (the Lite case it
// snaps into, printed in black SLS 3201PA-F nylon for the Lite). Renders index.html in headless Chromium and writes to
// public/products/:
//   stills  kebe-lite-{hero,top,glow,ports}.jpg, 2400 x 1800 (glow is also the 3D viewer's poster)
//   glb     kebe-lite.glb, the model at true size in metres, LEDs on (the product page's 3D viewer)
//
// Needs Playwright (playwright or playwright-core, through NODE_PATH like render-v2) and network access for three.js
// from jsDelivr. PW_CHANNEL=chrome drives the installed Chrome instead of Playwright's own Chromium.

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", "public", "products");
const ROOT = process.env.KEBE_ROOT ?? "C:/Users/brise/OneDrive/Documents/Projects/KeBe";
const VIEWS = ["hero", "top", "glow", "ports"];
const W = 2400, H = 1800;
const JOBS = process.argv.slice(2).length ? process.argv.slice(2) : ["stills", "glb"];
const TYPES = { ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml" };

async function stage() {
  const dir = await mkdtemp(path.join(tmpdir(), "kebe-lite-render-"));
  await mkdir(path.join(dir, "assets"), { recursive: true });
  for (const f of ["lite.json", "legends.svg"]) {
    await copyFile(path.join(ROOT, "PCBs/lite/viewer/assets", f), path.join(dir, "assets", f));
  }
  await copyFile(path.join(ROOT, "PCBs/lite/case/KEBE-LITE-CASE.stl"), path.join(dir, "assets/case.stl"));
  await copyFile(path.join(HERE, "index.html"), path.join(dir, "index.html"));
  return dir;
}

let dir, server, browser, port;

// Loopback only, and nothing outside the staging directory.
const serve = () => createServer(async (req, res) => {
  try {
    const p = path.resolve(dir, "." + decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(dir + path.sep)) throw new Error("outside the staging dir");
    const body = await readFile(p);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require("playwright"); } catch { return require("playwright-core"); }
})();

async function open(view, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.error(`${view}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && console.error(`${view}: ${m.text()}`));
  page.on("requestfailed", (r) => console.error(`${view}: could not load ${r.url()}`));
  await page.goto(`http://127.0.0.1:${port}/index.html?view=${view}&w=${w}&h=${h}`);
  await page.waitForFunction("window.__done === true", null, { timeout: 180000 });
  return page;
}

try {
  dir = await stage();
  server = serve();
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  port = server.address().port;
  browser = await chromium.launch({
    channel: process.env.PW_CHANNEL,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  await mkdir(OUT, { recursive: true });
  if (JOBS.includes("glb")) {
    const page = await open("glb", 64, 64);
    const b64 = await page.evaluate(() => window.__glb);
    await page.close();
    const out = path.join(OUT, "kebe-lite.glb");
    await writeFile(out, Buffer.from(b64, "base64"));
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  }
  for (const view of JOBS.includes("stills") ? VIEWS : []) {
    const page = await open(view, W, H);
    const png = await page.locator("canvas").screenshot();
    const out = path.join(OUT, `kebe-lite-${view}.jpg`);
    await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
    await page.close();
  }
} finally {
  await browser?.close();
  server?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
}
