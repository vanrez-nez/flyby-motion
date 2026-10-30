import React from 'react';
import { SearchPalette } from './SearchPalette';
import { DEFAULT_DEMO_PATH, GITHUB_URL, withBase } from '../routes';
import { githubIcon } from '../icons';
import logoUrl from '../../flyby-logo.svg';
import './SiteHeader.css';

export type SiteSection = 'home' | 'docs' | 'demos';

// One "Demos" entry: it opens the first demo, and the demo toolbar's 2D | 3D selector switches dimension.
const sections: Array<{ key: Exclude<SiteSection, 'home'>; label: string; path: string }> = [
  { key: 'docs', label: 'Docs', path: '/docs' },
  { key: 'demos', label: 'Demos', path: DEFAULT_DEMO_PATH },
];

export interface SiteHeaderProps {
  active?: SiteSection;
  /** `overlay` keeps the header transparent over the landing scene. */
  variant?: 'solid' | 'overlay';
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ active, variant = 'solid' }) => {
  return (
    <header className={`site-header site-header--${variant}`}>
      <div className="site-container site-header__inner">
        <div className="site-header__start">
          <a className="site-header__brand" href={withBase('/')} aria-label="flyby-motion home">
            <img src={logoUrl} alt="" className="site-header__logo" />
          </a>
          <nav className="site-header__nav" aria-label="Main">
            {sections.map((section) => (
              <a
                key={section.key}
                href={withBase(section.path)}
                className="site-header__link"
                aria-current={section.key === active ? 'page' : undefined}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="site-header__end">
          <SearchPalette />
          <tp-button
            variant="ghost"
            size="icon-sm"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
          >
            <tp-icon slot="icon-start" icon={githubIcon}></tp-icon>
            GitHub
          </tp-button>
          <tp-theme-switcher variant="button" size="sm" default-value="dark"></tp-theme-switcher>
        </div>
      </div>
    </header>
  );
};
