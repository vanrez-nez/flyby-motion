import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/atom-one-dark.css';
import { stopCanvasPassthrough } from './stopPassthrough';
import './demoSidebar.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('html', xml);

export interface DemoSidebarSource {
  label: string;
  language?: string;
  code: string;
}

export interface DemoSidebarConfig {
  storageKey: string;
  markdown: string;
  sources?: DemoSidebarSource[];
}

interface SidebarLayout {
  open: boolean;
  rightWidth: number;
  bottomHeight: number;
}

const DEFAULT_RIGHT_WIDTH = 360;
const DEFAULT_BOTTOM_HEIGHT = 320;
const MIN_RIGHT_WIDTH = 240;
const MAX_RIGHT_WIDTH_RATIO = 0.65;
const MIN_BOTTOM_HEIGHT = 180;
const MAX_BOTTOM_HEIGHT_RATIO = 0.7;

export function mountDemoSidebar(config: DemoSidebarConfig): void {
  const root = document.createElement('aside');
  root.className = 'demo-sidebar';

  const handle = document.createElement('div');
  handle.className = 'demo-sidebar__handle';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.tabIndex = 0;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'demo-sidebar__close';
  closeButton.setAttribute('aria-label', 'Close sidebar');
  closeButton.innerHTML = '&times;';

  const content = document.createElement('div');
  content.className = 'demo-sidebar__content';

  const article = document.createElement('article');
  article.className = 'demo-sidebar__article';
  content.appendChild(article);

  const sourceList = document.createElement('div');
  sourceList.className = 'demo-sidebar__sources';
  content.appendChild(sourceList);

  root.append(handle, closeButton, content);

  const reopenButton = document.createElement('button');
  reopenButton.type = 'button';
  reopenButton.className = 'demo-sidebar__reopen';
  reopenButton.setAttribute('aria-label', 'Open sidebar');
  reopenButton.textContent = 'Docs';

  document.body.append(root, reopenButton);

  stopCanvasPassthrough(root);
  stopCanvasPassthrough(reopenButton);

  renderMarkdown(article, config.markdown);
  renderSources(sourceList, config.sources ?? []);

  const layout = loadLayout(config.storageKey);
  applyLayout(root, reopenButton, layout);

  closeButton.addEventListener('click', () => {
    layout.open = false;
    saveLayout(config.storageKey, layout);
    applyLayout(root, reopenButton, layout);
  });

  reopenButton.addEventListener('click', () => {
    layout.open = true;
    saveLayout(config.storageKey, layout);
    applyLayout(root, reopenButton, layout);
  });

  enableResize(handle, root, layout, () => saveLayout(config.storageKey, layout));

  window.addEventListener('resize', () => {
    applyLayout(root, reopenButton, layout);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && layout.open && document.activeElement !== document.body) {
      // don't hijack tweakpane / inputs; only act when nothing is focused
      return;
    }
    if (event.key.toLowerCase() === 'd' && (event.metaKey || event.ctrlKey)) return;
    if (event.key.toLowerCase() === '?') {
      event.preventDefault();
      layout.open = !layout.open;
      saveLayout(config.storageKey, layout);
      applyLayout(root, reopenButton, layout);
    }
  });
}

function renderMarkdown(target: HTMLElement, markdown: string): void {
  marked.use({
    gfm: true,
    breaks: false,
  });
  const html = marked.parse(markdown, { async: false }) as string;
  target.innerHTML = html;
  target.querySelectorAll('pre code').forEach((block) => {
    const element = block as HTMLElement;
    const lang = detectLanguage(element);
    if (lang) {
      element.classList.add(`language-${lang}`);
      const result = hljs.highlight(element.textContent ?? '', { language: lang, ignoreIllegals: true });
      element.innerHTML = result.value;
    } else {
      element.innerHTML = hljs.highlightAuto(element.textContent ?? '').value;
    }
    element.classList.add('hljs');
  });
}

function detectLanguage(block: HTMLElement): string | undefined {
  const cls = Array.from(block.classList).find((c) => c.startsWith('language-'));
  if (!cls) return undefined;
  const lang = cls.slice('language-'.length);
  return hljs.getLanguage(lang) ? lang : undefined;
}

function renderSources(target: HTMLElement, sources: DemoSidebarSource[]): void {
  target.replaceChildren();
  sources.forEach((source) => {
    const details = document.createElement('details');
    details.className = 'demo-sidebar__source';

    const summary = document.createElement('summary');
    summary.textContent = source.label;
    details.appendChild(summary);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const lang = source.language && hljs.getLanguage(source.language) ? source.language : 'typescript';
    code.className = `language-${lang} hljs`;
    code.innerHTML = hljs.highlight(source.code, { language: lang, ignoreIllegals: true }).value;
    pre.appendChild(code);
    details.appendChild(pre);

    target.appendChild(details);
  });
}

function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

function applyLayout(root: HTMLElement, reopen: HTMLElement, layout: SidebarLayout): void {
  const portrait = isPortrait();
  root.classList.toggle('demo-sidebar--bottom', portrait);
  root.classList.toggle('demo-sidebar--right', !portrait);
  root.classList.toggle('demo-sidebar--closed', !layout.open);
  reopen.classList.toggle('is-visible', !layout.open);

  if (portrait) {
    const max = Math.floor(window.innerHeight * MAX_BOTTOM_HEIGHT_RATIO);
    const height = clamp(layout.bottomHeight, MIN_BOTTOM_HEIGHT, max);
    root.style.height = `${height}px`;
    root.style.width = '';
  } else {
    const max = Math.floor(window.innerWidth * MAX_RIGHT_WIDTH_RATIO);
    const width = clamp(layout.rightWidth, MIN_RIGHT_WIDTH, max);
    root.style.width = `${width}px`;
    root.style.height = '';
  }
}

function enableResize(
  handle: HTMLElement,
  root: HTMLElement,
  layout: SidebarLayout,
  persist: () => void,
): void {
  let dragging = false;
  let portrait = isPortrait();

  handle.addEventListener('pointerdown', (event) => {
    if (!layout.open) return;
    dragging = true;
    portrait = isPortrait();
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add('demo-sidebar-resizing');
    event.preventDefault();
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    if (portrait) {
      const max = Math.floor(window.innerHeight * MAX_BOTTOM_HEIGHT_RATIO);
      layout.bottomHeight = clamp(window.innerHeight - event.clientY, MIN_BOTTOM_HEIGHT, max);
      root.style.height = `${layout.bottomHeight}px`;
    } else {
      const max = Math.floor(window.innerWidth * MAX_RIGHT_WIDTH_RATIO);
      layout.rightWidth = clamp(window.innerWidth - event.clientX, MIN_RIGHT_WIDTH, max);
      root.style.width = `${layout.rightWidth}px`;
    }
  });

  const stop = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('demo-sidebar-resizing');
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    persist();
  };

  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

function loadLayout(key: string): SidebarLayout {
  const fallback: SidebarLayout = {
    open: true,
    rightWidth: DEFAULT_RIGHT_WIDTH,
    bottomHeight: DEFAULT_BOTTOM_HEIGHT,
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
    // ignore quota / privacy mode errors
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
