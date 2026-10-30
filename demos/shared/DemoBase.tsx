import React, { ReactNode, useLayoutEffect } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { DemoFooter } from './components/DemoFooter';
import { counterpartPath, demoDimension, demoLinks, withBase, type DemoKey } from './routes';
import './DemoBase.css';

export type { DemoKey } from './routes';

/** Sub-navigation of the demo pages: the four demos of the current dimension and a 2D / 3D switch. */
const DemoToolbar: React.FC<{ active?: DemoKey }> = ({ active }) => {
  const dimension = demoDimension(active);
  const links = demoLinks[dimension];

  return (
    <div className="demo-toolbar">
      <tp-button-group label={`${dimension.toUpperCase()} demos`} class="demo-toolbar__demos">
        {links.map((link) => (
          <tp-button
            key={link.key}
            size="sm"
            variant={link.key === active ? 'secondary' : 'ghost'}
            href={withBase(link.path)}
            aria-current={link.key === active ? 'page' : undefined}
          >
            {link.label}
          </tp-button>
        ))}
      </tp-button-group>

      <tp-button-group label="Dimension" joined class="demo-toolbar__dimension">
        {(['2d', '3d'] as const).map((d) => (
          <tp-button
            key={d}
            size="sm"
            variant={d === dimension ? 'secondary' : 'outline'}
            href={withBase(counterpartPath(active, d))}
            aria-current={d === dimension ? 'page' : undefined}
          >
            {d.toUpperCase()}
          </tp-button>
        ))}
      </tp-button-group>
    </div>
  );
};

export interface DemoBaseProps {
  activeDemo?: DemoKey;
  sidebar?: ReactNode;
  children?: ReactNode;
}

export const DemoBase: React.FC<DemoBaseProps> = ({ activeDemo, sidebar, children }) => {
  // The demo frame fills the viewport; document scrolling is locked only while it is mounted.
  useLayoutEffect(() => {
    document.documentElement.classList.add('site-fixed-viewport');
    return () => document.documentElement.classList.remove('site-fixed-viewport');
  }, []);

  return (
    <div className="demo-base">
      <div className="demo-base__header">
        <SiteHeader active="demos" />
        <DemoToolbar active={activeDemo} />
      </div>

      <div className="demo-base__body">
        <main className="demo-base__content">
          {children}
        </main>

        {sidebar && (
          <aside className="demo-base__sidebar">
            {sidebar}
          </aside>
        )}
      </div>

      <div className="demo-base__footer">
        <DemoFooter />
      </div>
    </div>
  );
};
