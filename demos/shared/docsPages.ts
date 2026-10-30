import tutorialMarkdown from '../../TUTORIAL.md?raw';
import { getMarkdownSections, slugify, type MarkdownSection } from './hooks/useMarkdown';

/**
 * The docs site structure, derived from TUTORIAL.md without changing its text.
 *
 * - Each `#` heading is a top-level entry of the left sidebar.
 * - A guide (Getting Started) stays one page; its outline is its `##` / `###` headings.
 * - A reference part (listed in PAGE_PER_SECTION) gets an overview page (its heading and intro)
 *   plus one page per `##` section; e.g. the `forces` page, whose outline is each force.
 *   Those pages' headings move up one level, so the section title renders as the page title.
 */
const PAGE_PER_SECTION = new Set(['api-reference']);

export interface DocsPage {
  id: string;
  title: string;
  /** App path, such as `/docs/forces`. */
  path: string;
  /** The top-level part the page belongs to (its own title for top-level pages). */
  groupTitle: string;
  markdown: string;
  /** The right-hand "On this page" entries. */
  outline: MarkdownSection[];
}

export interface DocsNavEntry {
  page: DocsPage;
  /** One page per section, for reference parts; empty for guides. */
  children: DocsPage[];
}

interface Chunk {
  title: string;
  lines: string[];
}

function isFence(line: string): boolean {
  return line.trim().startsWith('```');
}

/** Splits lines at headings of one level, ignoring `#` lines inside fenced code. */
function splitAtHeading(lines: string[], level: number): { preamble: string[]; chunks: Chunk[] } {
  const prefix = `${'#'.repeat(level)} `;
  const preamble: string[] = [];
  const chunks: Chunk[] = [];
  let inFence = false;
  for (const line of lines) {
    if (isFence(line)) inFence = !inFence;
    if (!inFence && line.startsWith(prefix)) {
      chunks.push({ title: line.slice(prefix.length).trim(), lines: [line] });
      continue;
    }
    (chunks.length > 0 ? chunks[chunks.length - 1].lines : preamble).push(line);
  }
  return { preamble, chunks };
}

/** `## x` → `# x`, `### y` → `## y`… outside fenced code. */
function promoteHeadings(lines: string[]): string[] {
  let inFence = false;
  return lines.map((line) => {
    if (isFence(line)) inFence = !inFence;
    return !inFence && /^#{2,6} /.test(line) ? line.slice(1) : line;
  });
}

function makePage(title: string, groupTitle: string, lines: string[]): DocsPage {
  const id = slugify(title);
  // A trailing `---` only separated the parts of the single long page.
  const markdown = lines.join('\n').trim().replace(/\n+-{3,}$/, '').trim();
  return {
    id,
    title,
    path: `/docs/${id}`,
    groupTitle,
    markdown,
    outline: getMarkdownSections(markdown).filter((section) => section.level > 1),
  };
}

function buildNav(source: string): DocsNavEntry[] {
  const { chunks: parts } = splitAtHeading(source.split('\n'), 1);
  return parts.map((part) => {
    if (!PAGE_PER_SECTION.has(slugify(part.title))) {
      return { page: makePage(part.title, part.title, part.lines), children: [] };
    }
    const [headingLine, ...body] = part.lines;
    const { preamble, chunks: sections } = splitAtHeading(body, 2);
    return {
      page: makePage(part.title, part.title, [headingLine, ...preamble]),
      children: sections.map((section) => makePage(section.title, part.title, promoteHeadings(section.lines))),
    };
  });
}

export const docsNav: DocsNavEntry[] = buildNav(tutorialMarkdown);

/** Every page in reading order, for previous / next links. */
export const docsPages: DocsPage[] = docsNav.flatMap((entry) => [entry.page, ...entry.children]);

export function findDocsPage(id: string | undefined): DocsPage | undefined {
  return id ? docsPages.find((page) => page.id === id) : undefined;
}

/** The page holding a heading id: keeps old single-page links such as `/docs#falloff` working. */
export function findDocsPageByHeading(id: string): DocsPage | undefined {
  return findDocsPage(id) ?? docsPages.find((page) => page.outline.some((section) => section.id === id));
}
