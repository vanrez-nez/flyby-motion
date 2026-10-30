import React from 'react';
import { GITHUB_URL, withBase } from '../routes';

export const DemoFooter: React.FC = () => {
  return (
    <footer className="site-footer">
      <a href={withBase('/')}>flyby-motion &copy; 2026</a>
      <nav className="site-footer__links" aria-label="Footer">
        <a href={withBase('/docs')}>Docs</a>
        <a href={withBase('/2d/forces')}>2D</a>
        <a href={withBase('/3d/forces')}>3D</a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </footer>
  );
};
