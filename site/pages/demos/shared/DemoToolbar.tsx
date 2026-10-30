import React from 'react';
import { counterpartPath, demoDimension, demoLinks, withBase, type DemoKey } from '../../../app/routes';

export interface DemoToolbarProps {
  active?: DemoKey;
  guideOpen: boolean;
  onToggleGuide: () => void;
}

/** Sub-navigation of the demo pages: the four demos of the current dimension and a 2D / 3D switch. */
export const DemoToolbar: React.FC<DemoToolbarProps> = ({ active, guideOpen, onToggleGuide }) => {
  const dimension = demoDimension(active);

  return (
    <div className="demo-toolbar">
      <div className="site-container demo-toolbar__inner">
        <tp-button-group label={`${dimension.toUpperCase()} demos`}>
          {demoLinks[dimension].map((link) => (
            <tp-button
              key={link.key}
              size="sm"
              variant={link.key === active ? 'secondary' : 'ghost'}
              href={withBase(link.path)}
              aria-current={link.key === active ? 'page' : undefined}
            >
              {link.label}
            </tp-button>
          ))}
        </tp-button-group>

        <div className="demo-toolbar__end">
          {!guideOpen && (
            <tp-button size="sm" variant="ghost" onClick={onToggleGuide}>Guide</tp-button>
          )}
          <tp-button-group label="Dimension" joined>
            {(['2d', '3d'] as const).map((d) => (
              <tp-button
                key={d}
                size="sm"
                variant={d === dimension ? 'secondary' : 'outline'}
                href={withBase(counterpartPath(active, d))}
                aria-current={d === dimension ? 'page' : undefined}
              >
                {d.toUpperCase()}
              </tp-button>
            ))}
          </tp-button-group>
        </div>
      </div>
    </div>
  );
};
