import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMarkdown, highlightCode } from '../hooks/useMarkdown';
import './Sidebar.css';

export interface SidebarSource {
  label: string;
  language?: string;
  code: string;
}

export interface SidebarProps {

  markdown: string;
  sources?: SidebarSource[];
}

const LAYOUT_STORAGE_KEY = 'flyby:sidebar:layout';

interface SidebarLayout {
  open: boolean;
  rightWidth: number;
  bottomHeight: number;
}

const MIN_RIGHT_WIDTH = 240;
const MAX_RIGHT_WIDTH_RATIO = 0.85;
const MIN_BOTTOM_HEIGHT = 180;
const MAX_BOTTOM_HEIGHT_RATIO = 0.85;

function loadLayout(key: string): SidebarLayout {
  const fallback: SidebarLayout = {
    open: true,
    rightWidth: Math.floor(window.innerWidth * 0.5),
    bottomHeight: Math.floor(window.innerHeight * 0.5),
  };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SidebarLayout>;
    return {
      open: typeof parsed.open === 'boolean' ? parsed.open : fallback.open,
      rightWidth: typeof parsed.rightWidth === 'number' ? parsed.rightWidth : fallback.rightWidth,
      bottomHeight: typeof parsed.bottomHeight === 'number' ? parsed.bottomHeight : fallback.bottomHeight,
    };
  } catch {
    return fallback;
  }
}

function saveLayout(key: string, layout: SidebarLayout): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const Sidebar: React.FC<SidebarProps> = ({ markdown, sources = [] }) => {
  const [layout, setLayout] = useState<SidebarLayout>(() => loadLayout(LAYOUT_STORAGE_KEY));
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
  
  const handleRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout; // sync latest layout state for drag handlers

  const htmlContent = useMarkdown(markdown);

  const persistLayout = useCallback((newLayout: SidebarLayout) => {
    setLayout(newLayout);
    saveLayout(LAYOUT_STORAGE_KEY, newLayout);
  }, []);

  useEffect(() => {
    const onResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    let dragging = false;
    let portrait = isPortrait;

    const onPointerDown = (event: PointerEvent) => {
      if (!layoutRef.current.open) return;
      dragging = true;
      portrait = window.innerHeight > window.innerWidth;
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add('demo-sidebar-resizing');
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      if (portrait) {
        const max = Math.floor(window.innerHeight * MAX_BOTTOM_HEIGHT_RATIO);
        const newHeight = clamp(window.innerHeight - event.clientY, MIN_BOTTOM_HEIGHT, max);
        setLayout((prev) => ({ ...prev, bottomHeight: newHeight }));
      } else {
        const max = Math.floor(window.innerWidth * MAX_RIGHT_WIDTH_RATIO);
        const newWidth = clamp(window.innerWidth - event.clientX, MIN_RIGHT_WIDTH, max);
        setLayout((prev) => ({ ...prev, rightWidth: newWidth }));
      }
    };

    const stop = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('demo-sidebar-resizing');
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      // Save on release
      saveLayout(LAYOUT_STORAGE_KEY, layoutRef.current);
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
  }, [isPortrait]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && layout.open && document.activeElement !== document.body) {
        return;
      }
      if (event.key.toLowerCase() === 'd' && (event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === '?') {
        event.preventDefault();
        persistLayout({ ...layout, open: !layout.open });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layout, persistLayout]);

  const toggleOpen = () => persistLayout({ ...layout, open: !layout.open });

  const style: React.CSSProperties = isPortrait
    ? { height: layout.bottomHeight, width: '100%', '--sidebar-height': `${layout.bottomHeight}px` } as React.CSSProperties
    : { width: layout.rightWidth, height: '100%', '--sidebar-width': `${layout.rightWidth}px` } as React.CSSProperties;

  return (
    <>
      <aside
        className={`demo-sidebar ${isPortrait ? 'demo-sidebar--bottom' : 'demo-sidebar--right'} ${
          !layout.open ? 'demo-sidebar--closed' : ''
        }`}
        style={style}
      >
        <div
          ref={handleRef}
          className="demo-sidebar__handle"
          role="separator"
          aria-orientation={isPortrait ? 'horizontal' : 'vertical'}
          tabIndex={0}
        />
        <button
          type="button"
          className="demo-sidebar__close"
          aria-label="Close sidebar"
          onClick={toggleOpen}
        >
          &times;
        </button>
        <div className="demo-sidebar__content">
          <article className="demo-sidebar__article" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          {sources.length > 0 && (
            <div className="demo-sidebar__sources">
              {sources.map((source, idx) => {
                const lang = source.language || 'typescript';
                return (
                  <details key={idx} className="demo-sidebar__source">
                    <summary>{source.label}</summary>
                    <pre>
                      <code 
                        className={`language-${lang} hljs`}
                        dangerouslySetInnerHTML={{ __html: highlightCode(source.code, lang) }}
                      />
                    </pre>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        className={`demo-sidebar__reopen ${!layout.open ? 'is-visible' : ''}`}
        aria-label="Open sidebar"
        onClick={toggleOpen}
      >
        Docs
      </button>
    </>
  );
};
