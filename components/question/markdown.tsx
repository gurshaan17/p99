import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Long-form incident prose — DESIGN.md section 9.
 *
 * `diagnosis` and `fix` are markdown (bold, lists, inline code), so they render
 * through react-markdown inside the existing `.prose-site` wrapper rather than
 * as a single pre-wrapped string.
 *
 * `remark-gfm` is on for tables, strikethrough, and autolinks. Raw HTML is
 * deliberately not enabled: incident content is authored in-repo, but a
 * markdown pipeline that executes embedded HTML is one more thing to reason
 * about when the content source changes, and nothing in the corpus needs it.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-site">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // DESIGN.md section 9: links are accent, underlined on hover. Handled
          // by .prose-site a, so these only need to keep the text colour.
          a: ({ children: c, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
