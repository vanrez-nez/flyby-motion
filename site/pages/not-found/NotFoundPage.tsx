import React from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { DEFAULT_DEMO_PATH, withBase } from '../../app/routes';
import { arrowRightIcon } from '../../lib/icons';
import './NotFoundPage.css';

/** Any path the router doesn't know: says which one, and offers the way back. */
export const NotFoundPage: React.FC<{ path: string }> = ({ path }) => {
  return (
    <div className="not-found">
      <SiteHeader />

      <main className="site-container not-found__body">
        <p className="site-eyebrow">Error 404</p>
        <h1 className="not-found__title">
          <span>Signal</span>
          <span className="not-found__title-line--outline">lost</span>
        </h1>
        <p className="not-found__lead">
          Nothing is flying at <code className="not-found__path">{path}</code>. The page may have
          moved, or the link has a typo.
        </p>
        <div className="not-found__actions">
          <tp-button size="lg" href={withBase('/')}>Back to home</tp-button>
          <tp-button size="lg" variant="outline" href={withBase(DEFAULT_DEMO_PATH)}>
            Demos
            <tp-icon slot="icon-end" icon={arrowRightIcon}></tp-icon>
          </tp-button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
