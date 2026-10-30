import React, { useLayoutEffect, useRef } from 'react';
import type { MarkdownHeadingTarget, TpMarkdown } from '@tweakpad/ui';
import { useElementEvent } from '../hooks/useElementEvent';

export interface MarkdownProps {
  source: string;
  /** `sm` steps text and headings down one size, for side panels. */
  size?: 'default' | 'sm';
  className?: string;
  /**
   * Called after every render with the rendered headings. They live in the element's shadow root,
   * so a table of contents targets them by element rather than by `#id`.
   */
  onHeadings?: (headings: readonly MarkdownHeadingTarget[]) => void;
}

/**
 * Renders markdown with the library's `<tp-markdown>`: CommonMark + GFM, fenced code as Code
 * blocks, `<kbd>` as Key hints, heading ids, and in-page `#heading` links (including scrolling to
 * the URL's heading on first render). The source is set as a property, never parsed as HTML first.
 */
export const Markdown: React.FC<MarkdownProps> = ({ source, size = 'default', className, onHeadings }) => {
  const ref = useRef<TpMarkdown & HTMLElement>(null);

  const onHeadingsRef = useRef(onHeadings);
  onHeadingsRef.current = onHeadings;

  // Later renders (a new source) report through the element's render event…
  useElementEvent<CustomEvent<{ headings: readonly MarkdownHeadingTarget[] }>>(ref, 'tp-markdown-render', (event) => {
    if (event.target === ref.current) onHeadingsRef.current?.(event.detail.headings);
  });

  // …and the first one can finish before that listener is attached, so read it once it completes.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.source = source;
    let cancelled = false;
    element.updateComplete.then(() => {
      if (!cancelled) onHeadingsRef.current?.(element.headings);
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  return <tp-markdown ref={ref} size={size} class={className}></tp-markdown>;
};
