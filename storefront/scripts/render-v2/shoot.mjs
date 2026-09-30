// Renders the KeBe v2 product pictures, 3D model and turntable video from the
// hardware project's CAD, so the store shows the board that ships rather than
// v1 photos:
//
//   KEBE_ROOT=<kebe repo> node scripts/render-v2/shoot.mjs [stills] [glb] [turntable] [composites]
//
// (no arguments = all four)
//
// Reads Case_Files/v3/KEBE-V3-BOTTOM.stl (the printed case's geometry),
// Keycaps/print/per-cap/*.svg (each cap's legend, drawn black; the renderer
// uses only its shape) and
// Keycaps/print/kebe-legend-list.csv (cap sizes and positions), renders
// index.html in headless Chromium, and writes to public/products/:
//   stills     kebe-v2-{hero,ports,top,glow}.jpg, 2400 x 1800
//   glb        kebe-v2.glb, the model at true size in metres (the 3D viewer)
//   turntable  kebe-v2-turntable.webm (VP9) + .mp4 (H.264) + .jpg poster: one
//              lit revolution, 1920 x 1080, 8 s at 30 fps, looping (the
//              homepage backdrop). Both codecs because Chromium builds without
//              licensed codecs cannot play H.264. Needs ffmpeg on PATH or
//              FFMPEG=<path>
//   composites kebe-v2-{desk,studio,night}.jpg: the exact keyboard, rendered
//              on a transparent background, put into the AI-generated scenes
//              in backplates/ (composite.py; needs python3 with
//              opencv-python-headless). Runs after stills, which it aligns to.
//              Then kebe-v2-{desk,night}-clip.{webm,mp4}: the AI camera moves
//              in backplates/*-clip.mp4 with the exact keyboard tracked back
//              in (composite_video.py; also needs ffmpeg).
//
// Needs Playwright with its Chromium (npm i -g playwright && npx playwright
// install chromium; NODE_PATH pointing at the global modules) and network
// access for three.js from jsDelivr (or three@0.170.0 installed where NODE_PATH
// finds it). Software WebGL is fine: each view takes a few seconds.

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
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
const JOBS = process.argv.slice(2).length ? process.argv.slice(2) : ["stills", "glb", "turntable", "composites"];
// [output, backplate, the still the backplate was generated from, render, mode,
//  the AI clip generated from the output, if any]
const COMPOSITES = [
  ["kebe-v2-desk.jpg", "desk.jpg", "kebe-v2-hero.jpg", "hero&alpha=1&light=window", "", "desk-clip.mp4"],
  ["kebe-v2-studio.jpg", "studio.jpg", "kebe-v2-hero.jpg", "hero&alpha=1", "", null],
  ["kebe-v2-night.jpg", "night.jpg", "kebe-v2-glow.jpg", "glow&alpha=1", "lit", "night-clip.mp4"],
];

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
  try {
    return await fill(dir);
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
}

async function fill(dir) {
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

// Set up below, inside the try whose finally takes them down again.
let dir, server, browser, port;

// Loopback only, and nothing outside the staging directory: while it runs
// this serves files, so it must not serve the rest of the disk.
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

// require, not import: NODE_PATH reaches a global Playwright only through it.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// A local three@0.170.0 (e.g. on NODE_PATH) stands in for jsDelivr, for
// machines whose browser cannot reach the CDN.
const CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0";
let localThree = null;
try {
  // three does not export its package.json; its main entry is build/three.cjs.
  const threeDir = path.resolve(path.dirname(require.resolve("three")), "..");
  const { version } = JSON.parse(await readFile(path.join(threeDir, "package.json"), "utf8"));
  if (version === "0.170.0") localThree = threeDir;
} catch {}

async function open(view, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.error(`${view}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && console.error(`${view}: ${m.text()}`));
  page.on("requestfailed", (r) => console.error(`${view}: could not load ${r.url()}`));
  if (localThree) {
    await page.route(`${CDN}/**`, (route) =>
      route.fulfill({ path: path.join(localThree, route.request().url().slice(CDN.length)) })
    );
  }
  await page.goto(`http://127.0.0.1:${port}/index.html?view=${view}&w=${w}&h=${h}`);
  await page.waitForFunction("window.__done === true", null, { timeout: 120000 });
  return page;
}

async function turntable() {
  const FRAMES = 240, TW = 1920, TH = 1080;
  const frames = await mkdtemp(path.join(tmpdir(), "kebe-turn-"));
  try {
    await shootTurntable(frames, FRAMES, TW, TH);
  } finally {
    await rm(frames, { recursive: true, force: true });
  }
}

async function shootTurntable(frames, FRAMES, TW, TH) {
  const page = await open("glowturn", TW, TH);
  const canvas = page.locator("canvas");
  for (let i = 0; i < FRAMES; i++) {
    await page.evaluate((t) => window.__frame(t), i / FRAMES);
    await canvas.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
  }
  await page.close();
  await sharp(path.join(frames, "f0000.png")).jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, "kebe-v2-turntable.jpg"));
  const input = ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(frames, "f%04d.png")];
  const encodes = {
    "kebe-v2-turntable.mp4": ["-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"],
    "kebe-v2-turntable.webm": ["-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an"],
  };
  for (const [name, args] of Object.entries(encodes)) {
    const out = path.join(OUT, name);
    const ff = spawnSync(process.env.FFMPEG ?? "ffmpeg", [...input, ...args, out], { stdio: "inherit" });
    if (ff.status !== 0) throw new Error(`ffmpeg failed on ${name} (${ff.status ?? ff.error})`);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  }
}

async function glb() {
  const page = await open("glb", 64, 64);
  const b64 = await page.evaluate(() => window.__glb);
  await page.close();
  const out = path.join(OUT, "kebe-v2.glb");
  await writeFile(out, Buffer.from(b64, "base64"));
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}

async function composites() {
  const layers = await mkdtemp(path.join(tmpdir(), "kebe-layers-"));
  try {
    for (const [name, plate, ref, view, mode, clip] of COMPOSITES) {
      const page = await open(view, W, H);
      const layer = path.join(layers, name.replace(/\.jpg$/, ".png"));
      await page.locator("canvas").screenshot({ path: layer, omitBackground: true });
      await page.close();
      const py = spawnSync(process.env.PYTHON ?? "python3", [
        path.join(HERE, "composite.py"), path.join(HERE, "backplates", plate),
        path.join(OUT, ref), layer, path.join(OUT, name), ...(mode ? [mode] : []),
      ], { stdio: "inherit" });
      if (py.status !== 0) throw new Error(`composite.py failed on ${name} (${py.status ?? py.error})`);
      if (!clip) continue;
      const vid = spawnSync(process.env.PYTHON ?? "python3", [
        "composite_video.py", path.join(HERE, "backplates", clip), path.join(OUT, name),
        path.join(HERE, "backplates", plate), path.join(OUT, ref), layer,
        path.join(OUT, name.replace(/\.jpg$/, "-clip")), ...(mode ? [mode] : []),
      ], { stdio: "inherit", cwd: HERE });
      if (vid.status !== 0) throw new Error(`composite_video.py failed on ${clip} (${vid.status ?? vid.error})`);
    }
  } finally {
    await rm(layers, { recursive: true, force: true });
  }
}

try {
  dir = await stage();
  server = serve();
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  port = server.address().port;
  browser = await chromium.launch({
    // PW_CHANNEL=chrome drives the installed Chrome instead of Playwright's
    // own Chromium, for machines without it.
    channel: process.env.PW_CHANNEL,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  await mkdir(OUT, { recursive: true });

  if (JOBS.includes("glb")) await glb();
  if (JOBS.includes("turntable")) await turntable();
  for (const view of JOBS.includes("stills") ? VIEWS : []) {
    const page = await open(view, W, H);
    const png = await page.locator("canvas").screenshot();
    const out = path.join(OUT, `kebe-v2-${view}.jpg`);
    await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
    await page.close();
  }
  if (JOBS.includes("composites")) await composites();
} finally {
  await browser?.close();
  server?.close();
  if (dir) await rm(dir, { recursive: true, force: true });
}
