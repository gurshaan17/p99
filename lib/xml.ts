/**
 * XML character-data escaping, shared by the RSS feed, the sitemap segments
 * and any other hand-rolled XML route.
 *
 * Not optional: a title containing `&` or `<` produces a document that fails
 * to parse, and RSS readers drop the whole feed when that happens. Also
 * strips control characters, which are illegal in XML 1.0 outright and would
 * make the document unrecoverable rather than merely wrong.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
