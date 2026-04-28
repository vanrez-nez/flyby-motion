import './demoChrome.css';

export type DemoKey =
  | 'forces'
  | 'behaviors'
  | 'modifiers'
  | 'custom'
  | 'three-forces'
  | 'three-behaviors'
  | 'three-modifiers'
  | 'three-custom';

const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

const twoDLinks: Array<{
  key: DemoKey;
  label: string;
  href: string;
}> = [
  { key: 'forces', label: 'Forces', href: '/2d/forces/index.html' },
  { key: 'behaviors', label: 'Behaviors', href: '/2d/behaviors/index.html' },
  { key: 'modifiers', label: 'Modifiers', href: '/2d/modifiers/index.html' },
  { key: 'custom', label: 'Custom', href: '/2d/custom/index.html' },
];

const threeDLinks: Array<{
  key: DemoKey;
  label: string;
  href: string;
}> = [
  { key: 'three-forces', label: 'Forces', href: '/3d/forces/index.html' },
  { key: 'three-behaviors', label: 'Behaviors', href: '/3d/behaviors/index.html' },
  { key: 'three-modifiers', label: 'Modifiers', href: '/3d/modifiers/index.html' },
  { key: 'three-custom', label: 'Custom', href: '/3d/custom/index.html' },
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

  const links = active?.startsWith('three-') ? threeDLinks : twoDLinks;
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
