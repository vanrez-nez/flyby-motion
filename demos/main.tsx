import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';
import { Forces2DDemo } from './2d/forces';
import { Behaviors2DDemo } from './2d/behaviors';
import { Modifiers2DDemo } from './2d/modifiers';
import { Custom2DDemo } from './2d/custom';
import { Forces3DDemo } from './3d/forces';
import { Behaviors3DDemo } from './3d/behaviors';
import { Modifiers3DDemo } from './3d/modifiers';
import { Custom3DDemo } from './3d/custom';
import './shared/colors.css';
import './style.css';
import './shared/markdown.css';
import 'highlight.js/styles/github-dark.css';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Hijack internal links to enable SPA routing without full page reloads
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      // Only hijack local, non-target-_blank links
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        target.target !== '_blank'
      ) {
        e.preventDefault();
        window.history.pushState({}, '', target.href);
        onLocationChange();
      }
    };

    window.addEventListener('popstate', onLocationChange);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Normalize current path
  const normalizedPath = currentPath.endsWith('/index.html') && currentPath !== '/index.html'
    ? currentPath.replace(/\/index\.html$/, '')
    : currentPath;

  // Simple route matching
  if (normalizedPath === '/' || normalizedPath === '/index.html') return <LandingPage />;
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
      <a href="/">Return Home</a>
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
