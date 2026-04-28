import React, { useEffect, useState } from 'react';
import { type MarkdownSection } from '../hooks/useMarkdown';

interface MarkdownNavProps {
  sections: MarkdownSection[];
  containerRef?: React.RefObject<HTMLElement>;
}

export const MarkdownNav: React.FC<MarkdownNavProps> = ({ sections, containerRef }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible or closest to the top
        const visibleEntry = entries.find(e => e.isIntersecting);
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        root: containerRef?.current || null,
        rootMargin: '-10% 0px -80% 0px', // Focus on the top part of the viewport
      }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, containerRef]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (sections.length === 0) return null;

  return (
    <nav className="markdown-nav">
      <div className="markdown-nav__title">Contents</div>
      <ul className="markdown-nav__list">
        {sections.map((section, idx) => (
          <li 
            key={idx} 
            className={`markdown-nav__item markdown-nav__item--l${section.level} ${activeId === section.id ? 'is-active' : ''}`}
          >
            <button 
              type="button" 
              onClick={() => scrollTo(section.id)}
            >
              {section.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
