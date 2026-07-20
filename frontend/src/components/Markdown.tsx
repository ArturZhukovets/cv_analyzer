import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";

const components: ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h3 className="mt-4 font-display text-lg font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mt-4 font-display text-base font-semibold tracking-tight first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-3 text-sm font-semibold first:mt-0">{children}</h5>
  ),
  p: ({ children }) => <p className="mt-3 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5 first:mt-0">{children}</ol>,
  a: ({ href, children }) => (
    <a href={href} className="text-accent underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-paper px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-line pl-3 text-ink-muted first:mt-0">
      {children}
    </blockquote>
  ),
};

// LLMs sometimes wrap a whole markdown answer in a ```markdown fence; unwrap it.
function stripOuterFence(text: string): string {
  const match = /^```[a-z]*\n([\s\S]*?)\n?```\s*$/.exec(text.trim());
  return match ? match[1] : text;
}

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown components={components}>{stripOuterFence(children)}</ReactMarkdown>
    </div>
  );
}
