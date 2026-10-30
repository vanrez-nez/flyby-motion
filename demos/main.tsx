import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@tweakpad/ui/styles.css';
import './shared/registerTweakpad';
import { LandingPage } from './LandingPage';
import { DocsPage } from './DocsPage';
import { toRoute, withBase } from './shared/routes';
import { Forces2DDemo } from './2d/forces';
import { Behaviors2DDemo } from './2d/behaviors';
import { Modifiers2DDemo } from './2d/modifiers';
import { Custom2DDemo } from './2d/custom';
import { Forces3DDemo } from './3d/forces';
import { Behaviors3DDemo } from './3d/behaviors';
import { Modifiers3DDemo } from './3d/modifiers';
import { Custom3DDemo } from './3d/custom';
import './shared/colors.css';
import './shared/site.css';
import './shared/markdown.css';

/** The anchor a click activated, including anchors rendered inside shadow roots (Tweakpad link buttons). */
function findAnchor(event: MouseEvent): HTMLAnchorElement | null {
  for (const node of event.composedPath()) {
    if (node instanceof HTMLAnchorElement && node.href) return node;
  }
  return null;
}

const App: React.FC = () => {
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
  if (normalizedPath === '/docs') return <DocsPage />;
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

const mountPoint = document.getElementById('app');
if (!mountPoint) throw new Error('Missing #app mount point');

// Prevent "already been passed to createRoot" warnings during HMR
if (!(mountPoint as any).__reactRoot) {
  (mountPoint as any).__reactRoot = createRoot(mountPoint);
}
(mountPoint as any).__reactRoot.render(<App />);
