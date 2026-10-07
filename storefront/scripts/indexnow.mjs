// Tells IndexNow which of the store's pages to recrawl: every <loc> in the
// live sitemap, in one POST to api.indexnow.org, which shares it with every
// search engine taking part (Bing among them; Google is not). The key is
// public by design: an engine checks that the site serves public/<key>.txt
// holding it (indexnow.org/documentation, read 6 Oct 2026).
//
//   node scripts/indexnow.mjs           prints the request, sends nothing
//   node scripts/indexnow.mjs --send    checks the key file is live, then sends
//
// A dry run is the default: without --send nothing leaves the machine but a
// GET of the sitemap. --site <url> is the public site the URLs belong to
// (default INDEXNOW_SITE, else https://kebe.grounders.app); --sitemap <url>
// reads the URLs from another sitemap, such as a local build's, while the
// host and keyLocation stay the public site's. Send after a deploy that
// changed pages, not on a timer: IndexNow answers 429 to a site that
// submits too often. The middleware's matcher names the key file, so a new
// key is renamed there too.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const PUBLIC_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public"
);
// IndexNow's key: 8 to 128 of a-z, A-Z, 0-9 and "-".
const KEY_FILE = /^([A-Za-z0-9-]{8,128})\.txt$/;
// The most one POST may carry.
const MAX_URLS = 10000;

// What each answer means, in IndexNow's own table.
const ANSWERS = {
  200: "OK: the URLs were submitted.",
  202: "Accepted: the URLs were received; the key is still being checked.",
  400: "Bad request: the format is invalid.",
  403: "Forbidden: the key is not valid (key file not found, or the key not in it).",
  422: "Unprocessable: a URL is not on the host, or the key does not match the protocol.",
  429: "Too many requests: wait before sending again.",
};

const args = process.argv.slice(2);
const send = args.includes("--send");
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const site = new URL(
  option("--site") ?? process.env.INDEXNOW_SITE ?? "https://kebe.grounders.app"
);
const sitemapUrl =
  option("--sitemap") ?? new URL("/sitemap.xml", site).toString();

// The key: the one file in public/ named <key>.txt whose text is that key.
async function findKey() {
  const keys = [];
  for (const name of await readdir(PUBLIC_DIR)) {
    const match = KEY_FILE.exec(name);
    if (!match) continue;
    const text = (await readFile(path.join(PUBLIC_DIR, name), "utf8")).trim();
    if (text === match[1]) keys.push(match[1]);
  }
  if (keys.length !== 1) {
    throw new Error(
      `expected one IndexNow key file in public/, found ${keys.length}`
    );
  }
  return keys[0];
}

const unescapeXml = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

// The sitemap's page URLs (its <loc>s; the image entries are <image:loc>),
// once each, only those on the site's host: IndexNow turns a request down
// with 422 if any URL is on another.
async function sitemapUrls() {
  const response = await fetch(sitemapUrl, {
    headers: { accept: "application/xml" },
  });
  if (!response.ok) {
    throw new Error(`${sitemapUrl} answered ${response.status}`);
  }
  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    unescapeXml(m[1].trim())
  );
  const own = [];
  const other = [];
  for (const loc of new Set(locs)) {
    (new URL(loc).host === site.host ? own : other).push(loc);
  }
  if (other.length) {
    console.error(
      `Left out ${other.length} URL(s) not on ${site.host}, e.g. ${other[0]}`
    );
  }
  return own;
}

async function main() {
  const key = await findKey();
  const keyLocation = new URL(`/${key}.txt`, site).toString();
  const urlList = await sitemapUrls();
  if (!urlList.length) throw new Error(`no URLs on ${site.host} in ${sitemapUrl}`);
  if (urlList.length > MAX_URLS) {
    throw new Error(`${urlList.length} URLs; one request takes ${MAX_URLS}`);
  }

  const payload = { host: site.host, key, keyLocation, urlList };

  if (!send) {
    console.log(`Dry run: nothing sent. With --send this goes to ${ENDPOINT}:`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // The engines fetch the key file before they take anything; a key the
  // site does not serve yet (not deployed) would only earn a 403.
  const keyResponse = await fetch(keyLocation);
  const served = keyResponse.ok ? (await keyResponse.text()).trim() : null;
  if (served !== key) {
    throw new Error(
      `${keyLocation} answered ${keyResponse.status}${
        served === null ? "" : " without the key"
      }: deploy the key file first`
    );
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(
    `${response.status} ${ANSWERS[response.status] ?? response.statusText}`
  );
  if (response.status !== 200 && response.status !== 202) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
