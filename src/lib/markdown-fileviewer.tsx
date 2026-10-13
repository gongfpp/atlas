import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "@/styles/hljs.css";

function handleWheel(e: React.WheelEvent<HTMLElement>) {
  const el = e.currentTarget;
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  e.preventDefault();
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (style.overflowY === "auto" || style.overflowY === "scroll") break;
    parent = parent.parentElement;
  }
  parent?.scrollBy({ top: e.deltaY });
}

interface Props {
  children: string;
  /**
   * Enables rendering of raw HTML (e.g. <details>, <img align>, etc.).
   * Should only be enabled for trusted/local Markdown documents.
   */
  trusted?: boolean;
  className?: string;
}
export const MarkdownFile = memo(function MarkdownFile({ children, trusted = false }: Props) {
  return (
    <div className="atlas-markdown text-sm leading-relaxed text-foreground break-words select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[...(trusted ? [rehypeRaw] : []), rehypeHighlight]}
        components={{
          h1: (p) => (
            <h1 className="mt-8 mb-3 border-b border-border pb-2 text-2xl font-bold tracking-tight">
              {p.children}
            </h1>
          ),

          h2: (p) => (
            <h2 className="mt-7 mb-3 border-b border-hairline pb-1.5 text-xl font-semibold tracking-tight">
              {p.children}
            </h2>
          ),

          h3: (p) => <h3 className="mt-6 mb-2 text-md font-semibold">{p.children}</h3>,

          h4: (p) => <h4 className="mt-4 mb-1.5 text-sm font-semibold">{p.children}</h4>,

          p: (p) => <p className="my-3">{p.children}</p>,

          a: (p) => (
            <a
              {...p}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline hover:opacity-80"
            />
          ),

          ul: (p) => <ul className="my-3 list-disc space-y-1 pl-6">{p.children}</ul>,

          ol: (p) => <ol className="my-3 list-decimal space-y-1 pl-6">{p.children}</ol>,

          li: (p) => <li className="leading-relaxed">{p.children}</li>,

          img: (p) => (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img {...p} className="my-1 inline-block h-auto max-w-full rounded align-middle" />
          ),

          code(props) {
            const { className, children, ...rest } = props as {
              className?: string;
              children?: React.ReactNode;
            };

            const isInline = !className;

            if (isInline) {
              return (
                <code
                  className="rounded bg-card px-1.5 py-0.5 font-mono type-reading text-foreground"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },

          pre: (p) => (
            <pre
              className="my-4 overflow-x-auto rounded-md border border-border bg-card type-reading"
              style={{
                whiteSpace: "pre",
                wordBreak: "normal",
              }}
              onWheel={handleWheel}
            >
              {p.children}
            </pre>
          ),

          blockquote: (p) => (
            <blockquote className="my-3 border-l-2 border-border pl-4 text-secondary-foreground">
              {p.children}
            </blockquote>
          ),

          hr: () => <hr className="my-6 border-hairline" />,

          table: (p) => (
            <div
              className="my-4 overflow-x-auto rounded-md border border-border"
              onWheel={handleWheel}
            >
              <table className="min-w-max type-reading">{p.children}</table>
            </div>
          ),

          thead: (p) => <thead className="bg-card">{p.children}</thead>,

          tr: (p) => <tr className="border-b border-hairline last:border-b-0">{p.children}</tr>,

          th: (p) => (
            <th className="border-r border-border border-b border-border px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-secondary-foreground last:border-r-0">
              {p.children}
            </th>
          ),

          td: (p) => (
            <td className="border-r border-hairline px-3 py-2 align-top whitespace-nowrap type-reading text-foreground last:border-r-0">
              {p.children}
            </td>
          ),

          ...(trusted && {
            details: (p) => (
              <details className="my-3 rounded-md border border-border bg-card px-3 py-2">
                {p.children}
              </details>
            ),

            summary: (p) => (
              <summary className="cursor-pointer py-1 font-medium text-foreground">
                {p.children}
              </summary>
            ),
          }),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
