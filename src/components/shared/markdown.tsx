import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const SAFE_HREF = /^(https?:|\/|#|mailto:)/;

/**
 * Safe markdown renderer. Raw HTML inside content is skipped, links are limited to
 * safe protocols, and images are not rendered — this sanitises CMS rich text.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-lesson", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            const safe = href && SAFE_HREF.test(href) ? href : undefined;
            const external = Boolean(safe?.startsWith("http"));
            return (
              <a href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
                {c}
              </a>
            );
          },
          table: ({ children: c }) => (
            <div className="overflow-x-auto">
              <table>{c}</table>
            </div>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
