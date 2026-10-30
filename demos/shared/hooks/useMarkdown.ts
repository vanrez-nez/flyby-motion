import { useMemo } from 'react';
import { Marked, type Tokens } from 'marked';

/**
 * Markdown rendering for the docs and the demo mini-guides.
 *
 * The markdown text is rendered as written; only the chrome changes:
 * - fenced code becomes a `<tp-code-block>` (syntax colors, language label, copy action),
 * - headings get stable ids, so the table of contents and the side nav can target them.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const markdown = new Marked({ gfm: true, breaks: false });

markdown.use({
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      const language = (lang ?? '').trim().split(/\s+/)[0] || 'plaintext';
      // The block reads its source from the `code` attribute, so the snippet is never parsed as markup.
      return `<tp-code-block class="markdown-code" language="${escapeAttribute(language)}" code="${escapeAttribute(text)}"></tp-code-block>\n`;
    },
    heading({ tokens, depth, text }: Tokens.Heading): string {
      const inner = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${inner}</h${depth}>\n`;
    },
  },
});

export interface MarkdownSection {
  id: string;
  text: string;
  level: number;
}

export function getMarkdownSections(source: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = source.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      sections.push({ id: slugify(text), text, level });
    }
  }
  return sections;
}

export function renderMarkdown(source: string): string {
  return markdown.parse(source, { async: false }) as string;
}

export function useMarkdown(source: string): string {
  return useMemo(() => renderMarkdown(source), [source]);
}
