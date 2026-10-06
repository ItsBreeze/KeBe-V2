const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * Crawlers that read the HTML without running it, for which Next waits for
 * the page's metadata so the <head> is whole (title, description, canonical,
 * hreflang) before the body streams; anyone else may get those tags later in
 * the stream, which a browser moves into the head. Next's own list, plus the
 * AI search and answer crawlers the store wants to reach (5 Oct 2026).
 */
let nextHtmlLimitedBots =
  "Mediapartners-Google|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti"
try {
  nextHtmlLimitedBots =
    require("next/dist/shared/lib/router/utils/html-bots").HTML_LIMITED_BOT_UA_RE
      .source
} catch {
  // An internal path; if a Next upgrade moves it, the copy above stands in.
}
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Amazonbot",
  "meta-externalagent",
  "Bytespider",
  "cohere-ai",
  "DuckAssistBot",
  "MistralAI-User",
]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: new RegExp(
    [nextHtmlLimitedBots, ...AI_CRAWLERS].join("|"),
    "i"
  ),
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Each named import from these two barrels is rewritten to the one module
  // it needs. Without it, every page that drew a Medusa Button also shipped
  // the whole of @medusajs/ui (DatePicker, CommandBar, Prism and the rest),
  // 242 KB gzip that a phone parses before the Pre-order button works
  // (6 Oct 2026).
  experimental: {
    optimizePackageImports: ["@medusajs/ui", "@medusajs/icons"],
  },
  // The pictures, clips and 3D model in public/products were served with
  // max-age=0, so every visit asked for each one again. A day fresh and a week
  // stale-while-revalidate, not immutable: their names carry no hash, and a
  // replaced file has to reach visitors. Media extensions only, so the
  // middleware's redirect of an address without a country, such as
  // /products/kebe-v2-keyboard, is not cached (6 Oct 2026).
  async headers() {
    return [
      {
        source:
          "/products/:file((?:.*)\\.(?:jpg|jpeg|png|webp|avif|glb|webm|mp4))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ]
  },
  // The addresses a buyer guesses for a store's policies all land on the
  // pre-order terms, which hold the cancel, late-delivery, return and
  // warranty terms (6 Oct 2026); before it each was a 404. Temporary, so a
  // page of its own can take one over later. These run before the
  // middleware: an address without a country, such as /refunds, is first
  // sent to /<country>/refunds by the middleware and then lands here.
  async redirects() {
    return [
      {
        source: "/:cc(ca|us)/:page(refunds|returns|shipping|faq)",
        destination: "/:cc/terms",
        permanent: false,
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
