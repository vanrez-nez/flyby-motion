import { inlineText, parseMarkdown, Slugger, slugify, type MarkdownHeading } from '@tweakpad/ui/markdown';
import tutorialMarkdown from '../../TUTORIAL.md?raw';

/**
 * The docs site structure, derived from TUTORIAL.md without changing its text.
 *
 * - Each `#` heading is a top-level entry of the left sidebar.
 * - A guide (Getting Started) stays one page; its outline is its `##` / `###` headings.
 * - A reference part (listed in PAGE_PER_SECTION) gets an overview page (its heading and intro)
 *   plus one page per `##` section; e.g. the `forces` page, whose outline is each force.
 *   Those pages' headings move up one level, so the section title is the page title.
 *
 * Headings come from the library's markdown parser, and the outline ids from its slugger, so they
 * are exactly the ids `<tp-markdown>` gives the rendered headings.
 */
const PAGE_PER_SECTION = new Set(['api-reference']);

export interface DocsOutlineItem {
  id: string;
  text: string;
  /** 1 for the page's top-level sections, 2 below them. */
  depth: number;
}

export interface DocsPage {
  id: string;
  title: string;
  /** App path, such as `/docs/forces`. */
  path: string;
  /** The top-level part the page belongs to (its own title for top-level pages). */
  groupTitle: string;
  /** The page's markdown; its first heading is `#`, the page title. */
  markdown: string;
  /** The right-hand "On this page" entries. */
  outline: DocsOutlineItem[];
}

export interface DocsNavEntry {
  page: DocsPage;
  /** One page per section, for reference parts; empty for guides. */
  children: DocsPage[];
}

interface Heading {
  depth: number;
  text: string;
  offset: number;
}

function headingsOf(source: string): Heading[] {
  return parseMarkdown(source).children
    .filter((node): node is MarkdownHeading => node.type === 'heading')
    .map((node) => ({ depth: node.depth, text: inlineText(node.children), offset: node.position?.start.offset ?? 0 }));
}

/**
 * Moves the page's headings up so its first heading is `#`: tp-markdown's `heading-offset` only
 * shifts headings down. Only the heading lines' `#` markers change, at the parser's own offsets,
 * so fenced code and the text stay exactly as written.
 */
function promoteHeadings(markdown: string, levels: number): string {
  if (levels <= 0) return markdown;
  return parseMarkdown(markdown).children
    .filter((node) => node.type === 'heading')
    .map((node) => node.position?.start.offset ?? -1)
    .filter((offset) => offset >= 0)
    .reverse()
    .reduce((text, offset) => text.slice(0, offset) + text.slice(offset + levels), markdown);
}

function makePage(source: string, headings: Heading[], end: number, groupTitle: string): DocsPage {
  const [first] = headings;
  // A trailing `---` only separated the parts of the single long page.
  const raw = source.slice(first.offset, end).trim().replace(/\n+-{3,}$/, '').trim();
  const markdown = promoteHeadings(raw, first.depth - 1);
  // The same slugger, in the same order, as tp-markdown uses for this page's headings.
  const slugger = new Slugger();
  const ids = headings.map((heading) => slugger.slug(heading.text));
  const pageDepth = first.depth;
  const id = slugify(first.text);
  return {
    id,
    title: first.text,
    path: `/docs/${id}`,
    groupTitle,
    markdown,
    outline: headings
      .map((heading, index) => ({ id: ids[index], text: heading.text, depth: heading.depth - pageDepth }))
      .filter((item) => item.depth === 1 || item.depth === 2),
  };
}

function buildNav(source: string): DocsNavEntry[] {
  const headings = headingsOf(source);
  const parts = headings.filter((heading) => heading.depth === 1);

  return parts.map((part, index) => {
    const end = parts[index + 1]?.offset ?? source.length;
    const inPart = headings.filter((heading) => heading.offset >= part.offset && heading.offset < end);

    if (!PAGE_PER_SECTION.has(slugify(part.text))) {
      return { page: makePage(source, inPart, end, part.text), children: [] };
    }

    const sections = inPart.filter((heading) => heading.depth === 2);
    const overviewEnd = sections[0]?.offset ?? end;
    return {
      page: makePage(source, [part], overviewEnd, part.text),
      children: sections.map((section, i) => {
        const sectionEnd = sections[i + 1]?.offset ?? end;
        const own = inPart.filter((heading) => heading.offset >= section.offset && heading.offset < sectionEnd);
        return makePage(source, own, sectionEnd, part.text);
      }),
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
  return findDocsPage(id) ?? docsPages.find((page) => page.outline.some((item) => item.id === id));
}
