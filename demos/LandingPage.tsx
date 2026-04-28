import React from 'react';
import { DemoKey } from './shared/DemoBase';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <h1 className="landing__title">&gt;&gt;flyby-motion</h1>
      <p className="landing__subtitle">Choose a demo to explore:</p>
      <div className="landing__buttons">
        <a href="/2d/forces" className="landing__buttons-btn landing__buttons-btn--2d">
          2D Demo
        </a>
        <a href="/3d/forces" className="landing__buttons-btn landing__buttons-btn--3d">
          3D Demo
        </a>
      </div>
    </div>
  );
};
