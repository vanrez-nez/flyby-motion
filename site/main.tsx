import { createRoot } from 'react-dom/client';
import '@tweakpad/ui/styles.css';
import './lib/registerTweakpad';
import { App } from './app/App';
// Site-wide styles last, so they layer over the Tweakpad and page styles imported above.
import './styles/colors.css';
import './styles/site.css';

const mountPoint = document.getElementById('app');
if (!mountPoint) throw new Error('Missing #app mount point');

// Prevent "already been passed to createRoot" warnings during HMR
if (!(mountPoint as any).__reactRoot) {
  (mountPoint as any).__reactRoot = createRoot(mountPoint);
}
(mountPoint as any).__reactRoot.render(<App />);

// Development only: the theme color configurator (stripped from the build, Tweakpane with it).
if (import.meta.env.DEV) {
  void import('./lib/theme/themeConfigurator').then(({ mountThemeConfigurator }) => mountThemeConfigurator());
}
