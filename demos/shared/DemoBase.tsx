import React, { ReactNode } from 'react';
import './DemoBase.css';

export type DemoKey =
  | 'forces'
  | 'behaviors'
  | 'modifiers'
  | 'custom'
  | 'three-forces'
  | 'three-behaviors'
  | 'three-modifiers'
  | 'three-custom';

const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

const twoDLinks: Array<{ key: DemoKey; label: string; href: string }> = [
  { key: 'forces', label: 'Forces', href: '/2d/forces' },
  { key: 'behaviors', label: 'Behaviors', href: '/2d/behaviors' },
  { key: 'modifiers', label: 'Modifiers', href: '/2d/modifiers' },
  { key: 'custom', label: 'Custom', href: '/2d/custom' },
];

const threeDLinks: Array<{ key: DemoKey; label: string; href: string }> = [
  { key: 'three-forces', label: 'Forces', href: '/3d/forces' },
  { key: 'three-behaviors', label: 'Behaviors', href: '/3d/behaviors' },
  { key: 'three-modifiers', label: 'Modifiers', href: '/3d/modifiers' },
  { key: 'three-custom', label: 'Custom', href: '/3d/custom' },
];

const DemoChromeHeader: React.FC<{ active?: DemoKey }> = ({ active }) => {
  const links = active?.startsWith('three-') ? threeDLinks : twoDLinks;

  return (
    <header className="demo-chrome demo-chrome__header">
      <a className="demo-chrome__title" href="/">
        Flyby Library
      </a>
      <nav className="demo-chrome__nav" aria-label="Demo navigation">
        {links.map((link) => (
          <a
            key={link.key}
            href={link.href}
            aria-current={link.key === active ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
};

const DemoChromeFooter: React.FC = () => {
  return (
    <footer className="demo-chrome demo-chrome__footer">
      <a href={GITHUB_URL} target="_blank" rel="noreferrer">
        GitHub
      </a>
    </footer>
  );
};

export interface DemoBaseProps {
  activeDemo?: DemoKey;
  sidebar?: ReactNode;
  children?: ReactNode;
}

export const DemoBase: React.FC<DemoBaseProps> = ({ activeDemo, sidebar, children }) => {
  return (
    <div className="demo-base">
      <div className="demo-base__header">
        <DemoChromeHeader active={activeDemo} />
      </div>
      
      <div className="demo-base__body">
        <main className="demo-base__content">
          {children}
        </main>
        
        {sidebar && (
          <aside className="demo-base__sidebar">
            {sidebar}
          </aside>
        )}
      </div>

      <div className="demo-base__footer">
        <DemoChromeFooter />
      </div>
    </div>
  );
};

