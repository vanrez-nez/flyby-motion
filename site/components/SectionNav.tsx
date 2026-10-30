import React, { useEffect, useId, useState } from 'react';
import { withBase } from '../app/routes';
import { chevronDownIcon } from '../lib/icons';
import './SectionNav.css';

export interface SectionNavItem {
  label: string;
  /** App path, such as `/docs/forces`. */
  path: string;
}

export interface SectionNavGroup {
  label: string;
  items: SectionNavItem[];
}

export interface SectionNavProps {
  /** Accessible name of the navigation, such as "Docs". */
  label: string;
  groups: SectionNavGroup[];
  currentPath: string;
}

/**
 * The pages of a section (docs, demos): group labels with flat links under each, the current page
 * marked on the rail. Wide screens show the list as a sidebar; narrow ones fold it into a bar that
 * says where you are ("API Reference / forces") and opens the list. Links are plain anchors: the
 * app's click handler routes them.
 */
export const SectionNav: React.FC<SectionNavProps> = ({ label, groups, currentPath }) => {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // Any way to another page (a link here, the pager, search, the back button) folds the list.
  useEffect(() => setOpen(false), [currentPath]);

  const currentGroup = groups.find((group) => group.items.some((item) => item.path === currentPath));
  const currentItem = currentGroup?.items.find((item) => item.path === currentPath);

  return (
    <nav className="section-nav" aria-label={label} data-open={open || undefined}>
      {/* Narrow screens only: where you are, and the way to the other pages. */}
      <button
        type="button"
        className="section-nav__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="section-nav__crumbs">
          {currentGroup && (
            <>
              <span className="section-nav__crumb">{currentGroup.label}</span>
              <span className="section-nav__crumb-separator" aria-hidden="true">/</span>
            </>
          )}
          <span className="section-nav__crumb section-nav__crumb--current">{currentItem?.label ?? label}</span>
        </span>
        <tp-icon class="section-nav__chevron" icon={chevronDownIcon}></tp-icon>
      </button>

      <div id={panelId} className="section-nav__panel">
        {groups.map((group) => (
          <div key={group.label} className="section-nav__group">
            <p className="section-nav__group-label">{group.label}</p>
            <ul className="section-nav__list">
              {group.items.map((item) => (
                <li key={item.path}>
                  <a
                    className="section-nav__link"
                    href={withBase(item.path)}
                    aria-current={item.path === currentPath ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
};
