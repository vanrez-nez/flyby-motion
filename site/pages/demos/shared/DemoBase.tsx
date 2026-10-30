import React, { ReactElement, ReactNode, cloneElement, isValidElement, useEffect, useLayoutEffect, useRef } from 'react';
import type { TpDrawer } from '@tweakpad/ui';
import { SiteHeader } from '../../../components/SiteHeader';
import { SiteFooter } from '../../../components/SiteFooter';
import { SectionNav, type SectionNavGroup } from '../../../components/SectionNav';
import { demoLinks, type DemoKey } from '../../../app/routes';
import './DemoBase.css';

export type { DemoKey } from '../../../app/routes';

/** The demos, as the docs list their pages: one group per dimension. */
const DEMO_NAV: SectionNavGroup[] = (['2d', '3d'] as const).map((dimension) => ({
  label: dimension.toUpperCase(),
  items: demoLinks[dimension].map((link) => ({ label: link.label, path: link.path })),
}));

const pathOf = (key: DemoKey | undefined) =>
  [...demoLinks['2d'], ...demoLinks['3d']].find((link) => link.key === key)?.path ?? '';

export interface DemoBaseProps {
  activeDemo?: DemoKey;
  /** The guide panel content; receives `onClose`. */
  sidebar?: ReactNode;
  children?: ReactNode;
}

export const DemoBase: React.FC<DemoBaseProps> = ({ activeDemo, sidebar, children }) => {
  const guideRef = useRef<TpDrawer & HTMLElement>(null);

  // The demo frame fills the viewport; document scrolling is locked only while it is mounted.
  useLayoutEffect(() => {
    document.documentElement.classList.add('site-fixed-viewport');
    return () => document.documentElement.classList.remove('site-fixed-viewport');
  }, []);

  const toggleGuide = () => {
    const drawer = guideRef.current;
    drawer?.setOpen(!drawer.open);
  };

  // `?` toggles the guide, as before (ignored while typing in a field).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.metaKey || event.ctrlKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      toggleGuide();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const guide = isValidElement(sidebar)
    ? cloneElement(sidebar as ReactElement<{ onClose?: () => void }>, { onClose: toggleGuide })
    : sidebar;

  return (
    <div className="demo-base">
      <div className="demo-base__header">
        <SiteHeader active="demos" />
      </div>

      <div className="demo-base__body">
        {/* The demos, listed like the docs pages: a sidebar, or a fold-out bar on narrow screens. */}
        <aside className="demo-base__nav">
          <SectionNav label="Demos" groups={DEMO_NAV} currentPath={pathOf(activeDemo)} />
        </aside>

        <main className="demo-base__content">
          {children}
          {/*
            The guide: a sheet from the bottom over the canvas, the full width of the window, opened
            by the button at the canvas's bottom-right or `?`. Non-modal, so the demo stays live
            and draggable while it is open. The drawer element has no box of its own
            (`display: contents`); the wrapper places its trigger.
          */}
          {sidebar && (
            <div className="demo-base__guide">
              <tp-drawer
                ref={guideRef}
                key={activeDemo}
                label="Guide"
                modality="non-modal"
                initial-focus="popup"
                show-swipe-handle
              >
                <tp-button slot="trigger" variant="outline" size="sm">Guide</tp-button>
                {guide}
              </tp-drawer>
            </div>
          )}
        </main>
      </div>

      <div className="demo-base__footer">
        <SiteFooter />
      </div>
    </div>
  );
};
