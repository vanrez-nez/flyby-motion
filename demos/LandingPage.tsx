import React from 'react';
import { SiteHeader } from './shared/components/SiteHeader';
import { DemoFooter } from './shared/components/DemoFooter';
import { MissionView } from './landing/mission/MissionView';
import { DEFAULT_DEMO_PATH, withBase } from './shared/routes';
import { arrowRightIcon } from './shared/icons';
import { version } from '../package.json';
import './LandingPage.css';

const INSTALL_COMMAND = 'npm install flyby-motion';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <SiteHeader active="home" variant="overlay" />

      <div className="site-container landing__body">
        <main className="landing__hero">
          <p className="site-eyebrow">flyby-motion {version}</p>
          <h1 className="landing__title">
            <span className="landing__title-line">Motion,</span>
            <span className="landing__title-line landing__title-line--outline">in flight</span>
          </h1>
          <p className="landing__lead">
            A small force-based motion library. Agents sum forces, integrate to velocity, integrate to
            position — no tweens, no keyframes. The drone flying this mission is one agent: every
            mode on its HUD is a force from the library, live.
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
        <DemoFooter />
      </div>
    </div>
  );
};
