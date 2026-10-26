// One schema.org entity as JSON-LD, in the server-rendered HTML where
// crawlers that run no JavaScript still read it. JSON.stringify leaves "<",
// ">" and "&" alone, so a description holding "</script>" would close the
// tag early: each goes out as its \u escape, which any JSON parser reads back
// as the same character, as do the two line separators old parsers trip on.
const escapeForScript = (json: string) =>
  json.replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
  )

export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeForScript(JSON.stringify(data)) }}
    />
  )
}
