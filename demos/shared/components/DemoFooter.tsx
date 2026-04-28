import React from 'react';

const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

export const DemoFooter: React.FC = () => {
  return (
    <footer className="demo-ui demo-ui__footer">
      <a href="/" style={{ opacity: 0.8 }}>
        flyby-motion &copy; 2026
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer">
        GitHub
      </a>
    </footer>
  );
};
