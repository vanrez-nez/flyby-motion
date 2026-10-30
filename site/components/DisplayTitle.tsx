import React from 'react';
import './DisplayTitle.css';

export interface DisplayTitleProps {
  /** The first line, solid in the foreground color. */
  solid: string;
  /** The second line, hollow, outlined in the accent. */
  outline: string;
  /** The page's own class, for size and alignment. */
  className?: string;
}

/**
 * The site's display headline: a solid line over an outlined accent line. Each line is drawn in
 * with Tweakpad's Text stroke when it enters the view, glyph outlines first, then the fill; the
 * Scroll trigger plays the second line a beat after the first.
 */
export const DisplayTitle: React.FC<DisplayTitleProps> = ({ solid, outline, className }) => {
  return (
    <tp-scroll-trigger className="display-title-trigger" stagger={260}>
      <h1 className={`display-title ${className ?? ''}`}>
        <span className="display-title__line">
          <tp-mo-text-stroke split="chars" stagger={45}>{solid}</tp-mo-text-stroke>
        </span>
        <span className="display-title__line display-title__line--outline">
          <tp-mo-text-stroke split="chars" stagger={45}>{outline}</tp-mo-text-stroke>
        </span>
      </h1>
    </tp-scroll-trigger>
  );
};
