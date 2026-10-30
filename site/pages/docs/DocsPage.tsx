import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MarkdownHeadingTarget, TpTableOfContentsItem, TpTreeView } from '@tweakpad/ui';
import { useElementEvent } from '../../hooks/useElementEvent';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { Markdown } from '../../components/Markdown';
import { docsNav, docsPages, type DocsPage as DocsPageData } from './docsPages';
import { navigate, withBase } from '../../app/routes';
import { arrowRightIcon } from '../../lib/icons';
import './DocsPage.css';

/** After a page change: back to the top, unless the URL names a heading (tp-markdown scrolls to it). */
function useScrollOnPageChange(pageId: string): void {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pageId]);
}

/** Previous / next page links at the end of each page. */
const PageNav: React.FC<{ page: DocsPageData }> = ({ page }) => {
  const index = docsPages.indexOf(page);
  const previous = docsPages[index - 1];
  const next = docsPages[index + 1];
  return (
    <nav className="docs__pager" aria-label="Docs pages">
      {previous ? (
        <tp-button variant="outline" href={withBase(previous.path)} class="docs__pager-link">
          <span className="docs__pager-label">Previous</span>
          {previous.title}
        </tp-button>
      ) : <span />}
      {next && (
        <tp-button variant="outline" href={withBase(next.path)} class="docs__pager-link docs__pager-link--next">
          <span className="docs__pager-label">Next</span>
          {next.title}
          <tp-icon slot="icon-end" icon={arrowRightIcon}></tp-icon>
        </tp-button>
      )}
    </nav>
  );
};

/**
 * One "On this page" entry. The rendered headings are inside tp-markdown's shadow root, so the
 * item targets the heading element (its `target` property) and keeps `#id` as its link.
 */
const OutlineItem: React.FC<{ heading: MarkdownHeadingTarget }> = ({ heading }) => {
  const ref = useRef<TpTableOfContentsItem & HTMLElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.target = heading.element;
  }, [heading.element]);
  return (
    <tp-table-of-contents-item ref={ref} href={heading.id ? `#${heading.id}` : undefined} depth={heading.depth - 1}>
      {heading.label}
    </tp-table-of-contents-item>
  );
};

export const DocsPage: React.FC<{ page: DocsPageData }> = ({ page }) => {
  const treeRef = useRef<TpTreeView & HTMLElement>(null);
  const [headings, setHeadings] = useState<readonly MarkdownHeadingTarget[]>([]);
  // The page's sections: `##` and `###`; the `#` is the page title.
  const outline = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);

  useScrollOnPageChange(page.id);

  // Left sidebar: the docs pages. Pressing one opens it; its sections are in the outline on the right.
  useElementEvent<CustomEvent<{ value: string }>>(treeRef, 'tp-action', (event) => {
    const value = event.detail.value;
    if (value.startsWith('/')) navigate(value);
  });

  // The selection is controlled: it always shows the current page, whichever way it was reached
  // (tree, pager, search, back button). Selection proposals are refused; navigation decides.
  useElementEvent(treeRef, 'tp-value-change', (event) => event.preventDefault());
  useEffect(() => {
    const tree = treeRef.current;
    if (tree) tree.value = [page.path];
  }, [page.path]);

  const defaultExpanded = JSON.stringify(docsNav.filter((entry) => entry.children.length > 0).map((entry) => entry.page.path));

  return (
    <div className="docs">
      <SiteHeader active="docs" />

      <div className="site-container docs__layout">
        <aside className="docs__nav">
          <tp-scroll-area class="docs__nav-scroll" scrollbar-visibility="on-hover">
            <nav aria-label="Docs">
              <tp-tree-view
                ref={treeRef}
                label="Docs"
                size="sm"
                guides="none"
                expansion-trigger="indicator"
                default-expanded={defaultExpanded}
                value={[page.path]}
              >
                {docsNav.map((entry) => (
                  <tp-tree-item key={entry.page.id} value={entry.page.path} data-section="">
                    {entry.page.title}
                    {entry.children.map((child) => (
                      <tp-tree-item key={child.id} value={child.path}>{child.title}</tp-tree-item>
                    ))}
                  </tp-tree-item>
                ))}
              </tp-tree-view>
            </nav>
          </tp-scroll-area>
        </aside>

        <main className="docs__main">
          {page.groupTitle !== page.title && <p className="site-eyebrow docs__eyebrow">{page.groupTitle}</p>}
          <Markdown key={page.id} source={page.markdown} onHeadings={setHeadings} />
          <PageNav page={page} />
        </main>

        <aside className="docs__toc">
          {outline.length > 0 && (
            <tp-table-of-contents key={page.id} label="On this page">
              {outline.map((heading) => (
                <OutlineItem key={heading.id ?? heading.label} heading={heading} />
              ))}
            </tp-table-of-contents>
          )}
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
};
