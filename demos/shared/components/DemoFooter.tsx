import React from 'react';
import { withBase } from '../routes';
// Named import: Vite inlines just this field, not the whole package.json.
import { version } from '../../../package.json';

/** Site footer: the package name and its version, read from package.json at build time. */
export const DemoFooter: React.FC = () => {
  return (
    <footer className="site-footer">
      <a href={withBase('/')}>flyby-motion {version}</a>
    </footer>
  );
};
