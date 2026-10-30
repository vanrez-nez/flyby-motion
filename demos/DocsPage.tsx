import React, { useEffect, useRef } from 'react';
import type { TpTreeView } from '@tweakpad/ui';
import { useMarkdown } from './shared/hooks/useMarkdown';
import { useElementEvent } from './shared/hooks/useElementEvent';
import { SiteHeader } from './shared/components/SiteHeader';
import { DemoFooter } from './shared/components/DemoFooter';
import { docsNav, docsPages, type DocsPage as DocsPageData } from './shared/docsPages';
import { navigate, withBase } from './shared/routes';
import { arrowRightIcon } from './shared/icons';
import './DocsPage.css';

function scrollToFragment(fallbackToTop: boolean): void {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target) target.scrollIntoView({ block: 'start' });
  else if (fallbackToTop) window.scrollTo(0, 0);
}

/**
 * After a page change: jump to the URL fragment's heading, or back to the top. Also follows
 * in-app navigation to another heading of the same page (a search result), which keeps the page mounted.
 */
function useScrollOnPageChange(pageId: string): void {
  useEffect(() => {
    // Wait a frame so the new article is in the DOM and laid out.
    const frame = requestAnimationFrame(() => scrollToFragment(true));
    return () => cancelAnimationFrame(frame);
  }, [pageId]);

  useEffect(() => {
    const onNavigate = () => requestAnimationFrame(() => scrollToFragment(false));
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
    };
  }, []);
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

export const DocsPage: React.FC<{ page: DocsPageData }> = ({ page }) => {
  const html = useMarkdown(page.markdown);
  const treeRef = useRef<TpTreeView & HTMLElement>(null);

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

      <div className="docs__layout">
        <aside className="docs__nav" aria-label="Docs navigation">
          <tp-tree-view
            ref={treeRef}
            label="Docs"
            size="sm"
            expansion-trigger="indicator"
            default-expanded={defaultExpanded}
            value={[page.path]}
          >
            {docsNav.map((entry) => (
              <tp-tree-item key={entry.page.id} value={entry.page.path}>
                {entry.page.title}
                {entry.children.map((child) => (
                  <tp-tree-item key={child.id} value={child.path}>{child.title}</tp-tree-item>
                ))}
              </tp-tree-item>
            ))}
          </tp-tree-view>
        </aside>

        <main className="docs__main">
          {page.groupTitle !== page.title && <p className="site-eyebrow docs__eyebrow">{page.groupTitle}</p>}
          <article key={page.id} className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          <PageNav page={page} />
        </main>

        <aside className="docs__toc">
          {page.outline.length > 0 && (
            <tp-table-of-contents key={page.id} label="On this page">
              {page.outline.map((section) => (
                <tp-table-of-contents-item key={section.id} href={`#${section.id}`} depth={section.level - 1}>
                  {section.text}
                </tp-table-of-contents-item>
              ))}
            </tp-table-of-contents>
          )}
        </aside>
      </div>

      <DemoFooter />
    </div>
  );
};
