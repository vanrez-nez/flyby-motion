import React, { useEffect, useState } from 'react';
import { LandingPage } from '../pages/landing/LandingPage';
import { DocsPage } from '../pages/docs/DocsPage';
import { toRoute, withBase } from './routes';
import { docsPages, findDocsPage, findDocsPageByHeading, type DocsPage as DocsPageData } from '../pages/docs/docsPages';
import { Forces2DDemo } from '../pages/demos/2d/forces';
import { Behaviors2DDemo } from '../pages/demos/2d/behaviors';
import { Modifiers2DDemo } from '../pages/demos/2d/modifiers';
import { Custom2DDemo } from '../pages/demos/2d/custom';
import { Forces3DDemo } from '../pages/demos/3d/forces';
import { Behaviors3DDemo } from '../pages/demos/3d/behaviors';
import { Modifiers3DDemo } from '../pages/demos/3d/modifiers';
import { Custom3DDemo } from '../pages/demos/3d/custom';

/**
 * `/docs/<page>` → that page. `/docs` → the first page, or, for links from the single-page docs
 * such as `/docs#falloff-within`, the page that now holds that heading. Unknown pages fall back
 * to the first page. The URL is rewritten to the page shown.
 */
function resolveDocsRoute(route: string): DocsPageData {
  const id = route.slice('/docs/'.length);
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const found = route !== '/docs' && findDocsPage(id);
  if (found) return found;
  // `/docs`, an old `/docs#heading` link or an unknown page: land on the best match.
  const page = (hash && findDocsPageByHeading(hash)) || findDocsPageByHeading(id) || docsPages[0];
  const fragment = hash && page.id !== hash ? `#${hash}` : '';
  window.history.replaceState({}, '', withBase(page.path) + fragment);
  return page;
}

/** The anchor a click activated, including anchors rendered inside shadow roots (Tweakpad link buttons). */
function findAnchor(event: MouseEvent): HTMLAnchorElement | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLAnchorElement && node.href) return node;
  }
  return null;
}

/** The site: client-side routing between the landing, the docs and the demo pages. */
export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Hijack internal links to enable SPA routing without full page reloads
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = findAnchor(e);
      // Only hijack local, non-target-_blank links
      if (
        !target ||
        !target.href.startsWith(window.location.origin) ||
        target.target === '_blank' ||
        target.hasAttribute('download')
      ) return;

      const url = new URL(target.href);
      // Same-page fragment links (the table of contents) scroll natively.
      if (url.pathname === window.location.pathname && url.hash) return;

      e.preventDefault();
      window.history.pushState({}, '', target.href);
      onLocationChange();
      if (!url.hash) window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', onLocationChange);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Strip base path and index.html for route matching (important for GitHub Pages /flyby-motion/)
  const normalizedPath = toRoute(currentPath);

  // Simple route matching
  if (normalizedPath === '/') return <LandingPage />;
  if (normalizedPath === '/docs' || normalizedPath.startsWith('/docs/')) {
    return <DocsPage page={resolveDocsRoute(normalizedPath)} />;
  }
  if (normalizedPath === '/2d/forces') return <Forces2DDemo />;
  if (normalizedPath === '/2d/behaviors') return <Behaviors2DDemo />;
  if (normalizedPath === '/2d/modifiers') return <Modifiers2DDemo />;
  if (normalizedPath === '/2d/custom') return <Custom2DDemo />;
  if (normalizedPath === '/3d/forces') return <Forces3DDemo />;
  if (normalizedPath === '/3d/behaviors') return <Behaviors3DDemo />;
  if (normalizedPath === '/3d/modifiers') return <Modifiers3DDemo />;
  if (normalizedPath === '/3d/custom') return <Custom3DDemo />;

  // Fallback for unmatched routes
  return (
    <div style={{ color: 'white', padding: '20px' }}>
      <h1>Demo Route Placeholder</h1>
      <p>Path: {currentPath}</p>
      <a href={withBase('/')}>Return Home</a>
    </div>
  );
};
