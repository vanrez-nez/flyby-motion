import React from 'react';
import { DemoKey } from './shared/DemoBase';
import { useMarkdown, getMarkdownSections } from './shared/hooks/useMarkdown';
import { MarkdownNav } from './shared/components/MarkdownNav';
import { DemoFooter } from './shared/components/DemoFooter';
import logoUrl from './flyby-logo.svg';
import tutorialMarkdown from '../TUTORIAL.md?raw';

export const LandingPage: React.FC = () => {
  const sections = getMarkdownSections(tutorialMarkdown);
  const html = useMarkdown(tutorialMarkdown);

  return (
    <div className="landing">
      <div className="landing__grid">
        <header className="landing__hero">
          <div className="landing__hero-brand">
            <img src={logoUrl} alt="Flyby Library" className="landing__logo" />
          </div>
          <div className="landing__buttons">
            <a href="/2d/forces" className="landing__buttons-btn landing__buttons-btn--2d">
              2D Demo
            </a>
            <a href="/3d/forces" className="landing__buttons-btn landing__buttons-btn--3d">
              3D Demo
            </a>
          </div>
        </header>

        <aside className="landing__sidebar">
          <MarkdownNav sections={sections} />
        </aside>

        <main className="landing__main">
          <article
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </div>

      <footer className="landing__footer">
        <DemoFooter />
      </footer>
    </div>
  );
};
