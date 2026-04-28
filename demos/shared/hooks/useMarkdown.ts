import { useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('html', xml);

marked.use({
  gfm: true,
  breaks: false,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface MarkdownSection {
  id: string;
  text: string;
  level: number;
}

export function getMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.split('\n');
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
      sections.push({
        id: slugify(text),
        text,
        level,
      });
    }
  }
  return sections;
}

export function useMarkdown(markdown: string): string {
  return useMemo(() => {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    
    // We parse the HTML into a DOM element to run highlight.js on the code blocks
    const div = document.createElement('div');
    div.innerHTML = rawHtml;
    
    // Add IDs to headings for navigation
    div.querySelectorAll('h1, h2, h3').forEach((h) => {
      const element = h as HTMLElement;
      if (!element.id) {
        element.id = slugify(element.textContent ?? '');
      }
    });
    
    div.querySelectorAll('pre code').forEach((block) => {
      const element = block as HTMLElement;
      const cls = Array.from(element.classList).find((c) => c.startsWith('language-'));
      const lang = cls ? cls.slice('language-'.length) : undefined;
      const validLang = lang && hljs.getLanguage(lang) ? lang : undefined;

      if (validLang) {
        element.classList.add(`language-${validLang}`);
        const result = hljs.highlight(element.textContent ?? '', { language: validLang, ignoreIllegals: true });
        element.innerHTML = result.value;
      } else {
        element.innerHTML = hljs.highlightAuto(element.textContent ?? '').value;
      }
      element.classList.add('hljs');
    });

    return div.innerHTML;
  }, [markdown]);
}

export function highlightCode(code: string, language: string = 'typescript'): string {
  const lang = hljs.getLanguage(language) ? language : 'typescript';
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
}
