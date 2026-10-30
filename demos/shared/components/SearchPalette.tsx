import React, { useEffect, useMemo, useRef } from 'react';
import type { CommandEntry, TpCommandPalette } from '@tweakpad/ui';
import { getMarkdownSections } from '../hooks/useMarkdown';
import { useElementEvent } from '../hooks/useElementEvent';
import { demoLinks, navigate } from '../routes';
import { searchIcon } from '../icons';
import { KeyHint } from './KeyHint';
import tutorialMarkdown from '../../../TUTORIAL.md?raw';

/** Header search: a Tweakpad command palette over the docs sections and the demos, opened with ⌘K / Ctrl K. */
export const SearchPalette: React.FC = () => {
  const paletteRef = useRef<TpCommandPalette & HTMLElement>(null);

  const items = useMemo<CommandEntry[]>(() => {
    const sections = getMarkdownSections(tutorialMarkdown);
    const docs: CommandEntry[] = [];
    let group: { type: 'group'; label: string; items: { value: string; label: string; keywords?: string[] }[] } | null = null;
    for (const section of sections) {
      if (section.level === 1) {
        group = { type: 'group', label: section.text, items: [] };
        docs.push(group);
      }
      group?.items.push({ value: `/docs#${section.id}`, label: section.text, keywords: ['docs'] });
    }
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
