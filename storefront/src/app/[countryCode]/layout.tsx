import { notFound } from "next/navigation"

import { storefrontCountries } from "@lib/data/seo"

// The first path segment is a store only when it is one of the regions'
// countries. Without this check any path the middleware let through (it
// passes anything with a "." untouched, for the files in public/) rendered
// the home page with a 200: /robots.txt, /sitemap.xml and /wp-login.php all
// answered as the store, a soft 404 to every crawler (5 Oct 2026). Two
// lowercase letters first, so junk costs no backend call; when the regions
// cannot be read the store still renders, rather than 404 every page.
export default async function CountryLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  if (!/^[a-z]{2}$/.test(countryCode)) {
    notFound()
  }

  const countries = await storefrontCountries()
  if (countries.length && !countries.includes(countryCode)) {
    notFound()
  }

  return props.children
}
