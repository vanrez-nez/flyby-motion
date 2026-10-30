import React from 'react';
import { withBase } from '../app/routes';
// Named import: Vite inlines just this field, not the whole package.json.
import { version } from '../../package.json';

/** Site footer: the package name and its version, read from package.json at build time. */
export const SiteFooter: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__inner">
        <a href={withBase('/')}>flyby-motion {version}</a>
      </div>
    </footer>
  );
};
