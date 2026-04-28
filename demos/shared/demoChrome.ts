import './demoChrome.css';

export type DemoKey =
  | 'forces'
  | 'behaviors'
  | 'modifiers'
  | 'custom'
  | 'three';

const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

const links: Array<{
  key: DemoKey;
  label: string;
  href: string;
}> = [
  { key: 'forces', label: 'Forces', href: '/demos/forces/index.html' },
  { key: 'behaviors', label: 'Behaviors', href: '/demos/behaviors/index.html' },
  { key: 'modifiers', label: 'Modifiers', href: '/demos/modifiers/index.html' },
  { key: 'custom', label: 'Custom', href: '/demos/custom/index.html' },
  { key: 'three', label: '3D', href: '/demos/3d/index.html' },
];

export function mountDemoChrome(active?: DemoKey): void {
  if (document.querySelector('.demo-chrome__header')) return;

  document.body.prepend(createHeader(active));
  document.body.appendChild(createFooter());
}

function createHeader(active?: DemoKey): HTMLElement {
  const header = document.createElement('header');
  header.className = 'demo-chrome demo-chrome__header';

  const title = document.createElement('a');
  title.className = 'demo-chrome__title';
  title.href = '/';
  title.textContent = 'Flyby Library';

  const nav = document.createElement('nav');
  nav.className = 'demo-chrome__nav';
  nav.setAttribute('aria-label', 'Demo navigation');

  links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    if (link.key === active) {
      anchor.setAttribute('aria-current', 'page');
    }
    nav.appendChild(anchor);
  });

  header.append(title, nav);
  return header;
}

function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'demo-chrome demo-chrome__footer';

  const link = document.createElement('a');
  link.href = GITHUB_URL;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'GitHub';

  footer.appendChild(link);
  return footer;
}
