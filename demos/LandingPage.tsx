import React, { useState } from 'react';
import { SiteHeader } from './shared/components/SiteHeader';
import { DemoFooter } from './shared/components/DemoFooter';
import { FlybyField3D } from './landing/FlybyField3D';
import { withBase } from './shared/routes';
import { arrowRightIcon } from './shared/icons';
import logoUrl from './flyby-logo.svg';
import pkg from '../package.json';
import './LandingPage.css';

const INSTALL_COMMAND = 'npm install flyby-motion';

export const LandingPage: React.FC = () => {
  const [formation, setFormation] = useState('sphere');

  return (
    <div className="landing">
      <FlybyField3D className="landing__field" logoUrl={logoUrl} onFormationChange={setFormation} />
      <div className="landing__veil" aria-hidden="true" />

      <SiteHeader active="home" variant="overlay" />

      <main className="landing__hero">
        <p className="site-eyebrow">flyby-motion {pkg.version}</p>
        <h1 className="landing__title">
          <span className="landing__title-line">Motion,</span>
          <span className="landing__title-line landing__title-line--outline">in flight</span>
        </h1>
        <p className="landing__lead">
          A small force-based motion library. Agents sum forces, integrate to velocity, integrate to
          position — no tweens, no keyframes. Everything behind this text is live agents: move the
          pointer through them, click to scatter.
        </p>

        <div className="landing__actions">
          <tp-button size="lg" href={withBase('/docs')}>Get started</tp-button>
          <tp-button size="lg" variant="outline" href={withBase('/3d/forces')}>
            Demos
            <tp-icon slot="icon-end" icon={arrowRightIcon}></tp-icon>
          </tp-button>
        </div>

        <div className="landing__install">
          <code className="landing__install-code">
            <span className="landing__install-prompt" aria-hidden="true">$</span> {INSTALL_COMMAND}
          </code>
          <tp-copy-button value={INSTALL_COMMAND} variant="ghost" size="sm" label="Copy install command"></tp-copy-button>
        </div>
      </main>

      <p className="landing__caption" aria-live="polite">
        <span className="landing__caption-dot" aria-hidden="true" />
        {formation} · attract + arrive · drift · swirl · repel
      </p>

      <div className="landing__footer">
        <DemoFooter />
      </div>
    </div>
  );
};
