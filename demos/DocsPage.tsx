import React, { useEffect, useMemo, useRef } from 'react';
import type { TpTreeView } from '@tweakpad/ui';
import { useMarkdown, getMarkdownSections, type MarkdownSection } from './shared/hooks/useMarkdown';
import { useElementEvent } from './shared/hooks/useElementEvent';
import { SiteHeader } from './shared/components/SiteHeader';
import { DemoFooter } from './shared/components/DemoFooter';
import tutorialMarkdown from '../TUTORIAL.md?raw';
import './DocsPage.css';

interface NavGroup {
  section: MarkdownSection;
  children: MarkdownSection[];
}

/** Top-level docs (h1) with their h2 sections, for the side nav. */
function groupSections(sections: MarkdownSection[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const section of sections) {
    if (section.level === 1) groups.push({ section, children: [] });
    else if (section.level === 2) groups[groups.length - 1]?.children.push(section);
  }
  return groups;
}

/** Scrolls to the heading named by the URL fragment (on arrival and on in-app navigation). */
function useFragmentScroll(): void {
  useEffect(() => {
    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };
    // Wait a frame so the article is in the DOM and laid out.
    const frame = requestAnimationFrame(scrollToHash);
    window.addEventListener('popstate', scrollToHash);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('popstate', scrollToHash);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);
}

export const DocsPage: React.FC = () => {
  const sections = useMemo(() => getMarkdownSections(tutorialMarkdown), []);
  const groups = useMemo(() => groupSections(sections), [sections]);
  const tocSections = useMemo(() => sections.filter((s) => s.level === 2 || s.level === 3), [sections]);
  const html = useMarkdown(tutorialMarkdown);
  const treeRef = useRef<TpTreeView & HTMLElement>(null);

  useFragmentScroll();

  // Section items carry their heading as `#id`; folders (`group:…`) only expand.
  useElementEvent<CustomEvent<{ value: string }>>(treeRef, 'tp-action', (event) => {
    const value = event.detail.value;
    if (!value.startsWith('#')) return;
    document.getElementById(value.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState({}, '', value);
  });

  const defaultExpanded = JSON.stringify(groups.map((g) => `group:${g.section.id}`));

  return (
    <div className="docs">
      <SiteHeader active="docs" />

      <div className="docs__layout">
        <aside className="docs__nav" aria-label="Docs navigation">
          <tp-tree-view
            ref={treeRef}
            label="Docs"
            size="sm"
            default-expanded={defaultExpanded}
          >
            {groups.map((group) => (
              <tp-tree-item key={group.section.id} value={`group:${group.section.id}`}>
                {group.section.text}
                <tp-tree-item value={`#${group.section.id}`}>Overview</tp-tree-item>
                {group.children.map((child) => (
                  <tp-tree-item key={child.id} value={`#${child.id}`}>{child.text}</tp-tree-item>
                ))}
              </tp-tree-item>
            ))}
          </tp-tree-view>
        </aside>

        <main className="docs__main">
          <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </main>

        <aside className="docs__toc">
          <tp-table-of-contents label="On this page">
            {tocSections.map((section) => (
              <tp-table-of-contents-item key={section.id} href={`#${section.id}`} depth={section.level - 1}>
                {section.text}
              </tp-table-of-contents-item>
            ))}
          </tp-table-of-contents>
        </aside>
      </div>

      <DemoFooter />
    </div>
  );
};
