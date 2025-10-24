'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

type Props = { md: string };

export default function LessonContentClient({ md }: Props) {
  return (
    <article className="prose mx-auto max-w-none prose-headings:scroll-mt-24">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        remarkPlugins={[remarkMath]}
        components={{
          // Headings
          h2: ({ children }) => (
            <h2 className="mt-10 mb-3 text-2xl font-bold tracking-tight border-b border-gray-200 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-xl font-semibold">{children}</h3>
          ),

          // Paragraphs & lists
          p: ({ children }) => <p className="leading-7 text-gray-800">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-4 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-5 list-decimal space-y-1">{children}</ol>
          ),

          // Code / inline code
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.95em]">
              {children}
            </code>
          ),

          // Blockquote — used by our Formula Box callout
          blockquote: ({ children }) => (
            <div className="my-6 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              {children}
            </div>
          ),

          // Details/summary for Hint/Answer
          details: ({ children }) => (
            <details className="my-3 rounded-xl border border-gray-200 p-3 open:bg-gray-50">
              {children}
            </details>
          ),
          summary: ({ children }) => (
            <summary className="cursor-pointer select-none font-semibold">
              {children}
            </summary>
          ),
        }}
      >
        {md}
      </ReactMarkdown>

      {/* Local styles to tune the look */}
      <style jsx global>{`
        .prose :where(h2 + p) {
          margin-top: 0.5rem;
        }
        .prose :where(h3 + p) {
          margin-top: 0.25rem;
        }
        /* Make the "📐 Formula Box" header stand out inside the callout */
        .prose blockquote > p:first-child strong {
          font-weight: 700;
        }
        /* Hide any stray first H1 inside markdown (we render the title above) */
        .prose > h1:first-child {
          display: none;
        }
      `}</style>
    </article>
  );
}
