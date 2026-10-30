import React from 'react';
import { SearchPalette } from './SearchPalette';
import { GITHUB_URL, withBase } from '../routes';
import { githubIcon } from '../icons';
import logoUrl from '../../flyby-logo.svg';
import './SiteHeader.css';

export type SiteSection = 'home' | 'docs' | '2d' | '3d';

const sections: Array<{ key: Exclude<SiteSection, 'home'>; label: string; path: string }> = [
  { key: 'docs', label: 'Docs', path: '/docs' },
  { key: '2d', label: '2D Demos', path: '/2d/forces' },
  { key: '3d', label: '3D Demos', path: '/3d/forces' },
];

export interface SiteHeaderProps {
  active?: SiteSection;
  /** `overlay` keeps the header transparent over the landing scene. */
  variant?: 'solid' | 'overlay';
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ active, variant = 'solid' }) => {
  return (
    <header className={`site-header site-header--${variant}`}>
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
    </header>
  );
};
