import React from 'react';
import { Copy } from 'lucide-react';

export function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.startsWith('```')) {
          const lines = block.split('\n');
          const firstLine = lines[0];
          const lang = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, -1).join('\n');

          return (
            <div key={idx} className="rounded-lg border border-white/5 bg-zinc-950 overflow-hidden my-3 select-text">
              <div className="flex items-center justify-between px-4 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <span>{lang}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs text-zinc-400 font-mono">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        return (
          <p key={idx} className="whitespace-pre-wrap select-text leading-relaxed">
            {lines.map((line, lIdx) => {
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const content = line.trim().substring(2);
                return (
                  <span
                    key={lIdx}
                    className="block pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-primary mt-1"
                  >
                    {parseInlineMarkdown(content)}
                  </span>
                );
              }
              const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                const num = numMatch[1];
                const content = numMatch[2];
                return (
                  <span
                    key={lIdx}
                    className="block pl-5 relative before:content-[attr(data-num)] before:absolute before:left-0 before:text-primary before:font-bold mt-1"
                    data-num={`${num}.`}
                  >
                    {parseInlineMarkdown(content)}
                  </span>
                );
              }
              return (
                <React.Fragment key={lIdx}>
                  {parseInlineMarkdown(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};
