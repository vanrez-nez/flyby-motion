import React from 'react';
import { Markdown } from './Markdown';
import { KeyHint } from './KeyHint';
import { xIcon } from '../icons';
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

/**
 * The guide panel of a demo: its mini-guide (`info.md`) and source. It renders the content only;
 * DemoBase places it in the resizable, collapsible panel and passes `onClose`.
 */
export const Sidebar: React.FC<SidebarProps & { onClose?: () => void }> = ({ markdown, sources = [], onClose }) => {
  return (
    <div className="demo-sidebar">
      <div className="demo-sidebar__bar">
        <span className="site-eyebrow">Guide</span>
        <span className="demo-sidebar__hint">
          <KeyHint>?</KeyHint> toggles
        </span>
        <tp-button variant="ghost" size="icon-sm" aria-label="Close guide" onClick={onClose}>
          <tp-icon slot="icon-start" icon={xIcon}></tp-icon>
          Close
        </tp-button>
      </div>
      <tp-scroll-area class="demo-sidebar__scroll" scrollbar-visibility="on-hover" label="Guide">
        <div className="demo-sidebar__content">
          <Markdown source={markdown} size="sm" />
          {sources.length > 0 && (
            <div className="demo-sidebar__sources">
              {sources.map((source) => (
                <tp-collapsible key={source.label}>
                  <span slot="label" className="demo-sidebar__source-label">Source · {source.label}</span>
                  <tp-code-block
                    language={source.language || 'typescript'}
                    label={source.label}
                    code={source.code}
                    line-numbers
                    collapsible
                    collapsed-lines={24}
                  ></tp-code-block>
                </tp-collapsible>
              ))}
            </div>
          )}
        </div>
      </tp-scroll-area>
    </div>
  );
};
