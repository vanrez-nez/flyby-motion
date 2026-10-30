import React from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { DisplayTitle } from '../../components/DisplayTitle';
import { MissionView } from './mission/MissionView';
import { DEFAULT_DEMO_PATH, withBase } from '../../app/routes';
import { arrowRightIcon } from '../../lib/icons';
import { version } from '../../../package.json';
import './LandingPage.css';

const INSTALL_COMMAND = 'npm install flyby-motion';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <SiteHeader active="home" variant="overlay" />

      <div className="site-container landing__body">
        <main className="landing__hero">
          <p className="site-eyebrow">flyby-motion {version}</p>
          <DisplayTitle className="landing__title" solid="Forces in" outline="motion out" />
          <p className="landing__lead">
            A small force-based motion library. Agents sum forces, integrate to velocity, then
            integrate to position. No tweens, no keyframes. Combine simple behaviors to create fluid,
            responsive motion without scripting every move.
          </p>

          <div className="landing__actions">
            <tp-button size="lg" href={withBase('/docs')}>Get started</tp-button>
            <tp-button size="lg" variant="outline" href={withBase(DEFAULT_DEMO_PATH)}>
              Demos
              <tp-icon slot="icon-end" icon={arrowRightIcon}></tp-icon>
            </tp-button>
          </div>

          <tp-code-block class="landing__install" language="bash" code={INSTALL_COMMAND}></tp-code-block>
        </main>

        <MissionView className="landing__mission" />
      </div>

      <div className="landing__footer">
        <SiteFooter />
      </div>
    </div>
  );
};
