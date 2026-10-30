/**
 * JSX typing for the Tweakpad UI custom elements used by the demo site.
 *
 * React 19 forwards props to custom elements as properties when the element defines them
 * (`icon`, `code`, `value`…) and as attributes otherwise (`default-expanded`, `aria-label`…),
 * so the props stay open-ended here. Events are bound through `useElementEvent`.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type TpElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  slot?: string;
  [attributeOrProperty: string]: unknown;
};

type TpTag =
  | 'tp-button'
  | 'tp-button-group'
  | 'tp-code-block'
  | 'tp-collapsible'
  | 'tp-command-palette'
  | 'tp-drawer'
  | 'tp-icon'
  | 'tp-key-hint'
  | 'tp-key-hint-group'
  | 'tp-markdown'
  | 'tp-mo-text-stroke'
  | 'tp-scroll-area'
  | 'tp-scroll-trigger'
  | 'tp-status-dot'
  | 'tp-table-of-contents'
  | 'tp-table-of-contents-item'
  | 'tp-theme-switcher';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends Record<TpTag, TpElementProps> {}
  }
}
