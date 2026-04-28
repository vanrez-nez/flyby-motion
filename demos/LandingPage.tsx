import React from 'react';
import { DemoKey } from './shared/DemoBase';
import { useMarkdown, getMarkdownSections } from './shared/hooks/useMarkdown';
import { MarkdownNav } from './shared/components/MarkdownNav';
import { DemoFooter } from './shared/components/DemoFooter';
import tutorialMarkdown from '../TUTORIAL.md?raw';

export const LandingPage: React.FC = () => {
  const sections = getMarkdownSections(tutorialMarkdown);
  const html = useMarkdown(tutorialMarkdown);

  return (
    <div className="landing">
      <h1 className="landing__title">JS Flyby Library</h1>
      <p className="landing__subtitle">Choose a demo to explore:</p>
      <div className="landing__buttons">
        <a href="/2d/forces" className="landing__buttons-btn landing__buttons-btn--2d">
          2D Demo
        </a>
        <a href="/3d/forces" className="landing__buttons-btn landing__buttons-btn--3d">
          3D Demo
        </a>
      </div>
      <div className="landing__tutorial">
        <MarkdownNav sections={sections} />
        <article
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      
      <footer className="landing__footer">
        <DemoFooter />
      </footer>
    </div>
  );
};
