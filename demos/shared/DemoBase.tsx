import React, { ReactElement, ReactNode, cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PanelLayout, TpResizablePanel, TpResizablePanelGroup } from '@tweakpad/ui';
import { SiteHeader } from './components/SiteHeader';
import { DemoFooter } from './components/DemoFooter';
import { DemoToolbar } from './components/DemoToolbar';
import { useElementEvent } from './hooks/useElementEvent';
import type { DemoKey } from './routes';
import './DemoBase.css';

export type { DemoKey } from './routes';

const LAYOUT_STORAGE_KEY = 'flyby:demo-layout';

/**
 * The canvas / guide split, remembered per orientation. The group restores it from `defaultLayout`
 * and reports each settled resize in `tp-layout-change-complete`.
 */
function loadLayout(orientation: string): PanelLayout | undefined {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${LAYOUT_STORAGE_KEY}:${orientation}`) ?? 'null');
    return value && typeof value === 'object' ? (value as PanelLayout) : undefined;
  } catch {
    return undefined;
  }
}

function saveLayout(orientation: string, layout: PanelLayout): void {
  try {
    window.localStorage.setItem(`${LAYOUT_STORAGE_KEY}:${orientation}`, JSON.stringify(layout));
  } catch {
    // storage unavailable: the layout just isn't remembered
  }
}

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const query = window.matchMedia('(orientation: portrait)');
    const onChange = () => setPortrait(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return portrait;
}

export interface DemoBaseProps {
  activeDemo?: DemoKey;
  /** The guide panel content; receives `onClose`. */
  sidebar?: ReactNode;
  children?: ReactNode;
}

export const DemoBase: React.FC<DemoBaseProps> = ({ activeDemo, sidebar, children }) => {
  const portrait = usePortrait();
  const orientation = portrait ? 'vertical' : 'horizontal';
  const guideRef = useRef<TpResizablePanel & HTMLElement>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  // The demo frame fills the viewport; document scrolling is locked only while it is mounted.
  useLayoutEffect(() => {
    document.documentElement.classList.add('site-fixed-viewport');
    return () => document.documentElement.classList.remove('site-fixed-viewport');
  }, []);

  const groupRef = useRef<TpResizablePanelGroup & HTMLElement>(null);
  useElementEvent<CustomEvent<{ layout: PanelLayout }>>(groupRef, 'tp-layout-change-complete', (event) => {
    if (event.target === groupRef.current) saveLayout(orientation, event.detail.layout);
  });

  const toggleGuide = () => {
    const panel = guideRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  // Collapsing by drag, Enter on the handle, the close button or `?` all report here.
  useElementEvent(guideRef, 'tp-panel-resize', () => setGuideOpen(!guideRef.current?.isCollapsed()));

  // `?` toggles the guide, as before (ignored while typing in a field).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.metaKey || event.ctrlKey) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
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
        <DemoToolbar active={activeDemo} guideOpen={guideOpen} onToggleGuide={toggleGuide} />
      </div>

      <div className="demo-base__body">
        {/* Remounted per orientation, so each restores its own saved split. */}
        <tp-resizable-panel-group
          key={orientation}
          ref={groupRef}
          orientation={orientation}
          defaultLayout={loadLayout(orientation)}
        >
          <tp-resizable-panel id="demo-canvas" min-size="30%">
            <main className="demo-base__content">{children}</main>
          </tp-resizable-panel>
          {sidebar && (
            <>
              <tp-resizable-handle label="Resize guide"></tp-resizable-handle>
              <tp-resizable-panel
                ref={guideRef}
                id="demo-guide"
                class="demo-base__guide"
                default-size="50%"
                min-size={portrait ? '180px' : '240px'}
                max-size="70%"
                collapsible
              >
                {guide}
              </tp-resizable-panel>
            </>
          )}
        </tp-resizable-panel-group>
      </div>

      <div className="demo-base__footer">
        <DemoFooter />
      </div>
    </div>
  );
};
