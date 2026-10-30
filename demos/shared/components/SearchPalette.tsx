import React, { useEffect, useMemo, useRef } from 'react';
import type { CommandEntry, TpCommandPalette } from '@tweakpad/ui';
import { useElementEvent } from '../hooks/useElementEvent';
import { demoLinks, navigate } from '../routes';
import { docsNav } from '../docsPages';
import { searchIcon } from '../icons';
import { KeyHint } from './KeyHint';

/** Header search: a Tweakpad command palette over the docs sections and the demos, opened with ⌘K / Ctrl K. */
export const SearchPalette: React.FC = () => {
  const paletteRef = useRef<TpCommandPalette & HTMLElement>(null);

  const items = useMemo<CommandEntry[]>(() => {
    // One group per top-level docs part: each page, then the sections of its outline.
    const docs: CommandEntry[] = docsNav.map((entry) => ({
      type: 'group' as const,
      label: entry.page.title,
      items: [entry.page, ...entry.children].flatMap((page) => [
        { value: page.path, label: page.title, keywords: ['docs', page.groupTitle] },
        ...page.outline.map((section) => ({
          value: `${page.path}#${section.id}`,
          label: section.text,
          description: page.title,
          keywords: ['docs', page.title],
        })),
      ]),
    }));
    return [
      ...docs,
      { type: 'separator' },
      {
        type: 'group',
        label: 'Demos',
        items: [
          ...demoLinks['2d'].map((link) => ({ value: link.path, label: `${link.label} 2D`, keywords: ['demo', '2d'] })),
          ...demoLinks['3d'].map((link) => ({ value: link.path, label: `${link.label} 3D`, keywords: ['demo', '3d'] })),
        ],
      },
    ];
  }, []);

  useEffect(() => {
    const palette = paletteRef.current;
    if (palette) palette.items = items;
  }, [items]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      paletteRef.current?.setOpen(true, 'programmatic', event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useElementEvent<CustomEvent<{ commandId: unknown }>>(paletteRef, 'tp-execute', (event) => {
    paletteRef.current?.close();
    navigate(String(event.detail.commandId));
  });

  return (
    <tp-command-palette
      ref={paletteRef}
      class="site-search"
      label="Search docs"
      placeholder="Search docs and demos…"
    >
      <tp-button slot="trigger" variant="outline" size="sm" class="site-search__trigger">
        <tp-icon slot="icon-start" icon={searchIcon}></tp-icon>
        <span className="site-search__label">Search docs…</span>
        <tp-key-hint-group slot="icon-end" separator="none" aria-hidden="true">
          <KeyHint keyName="mod" />
          <KeyHint>K</KeyHint>
        </tp-key-hint-group>
      </tp-button>
    </tp-command-palette>
  );
};
