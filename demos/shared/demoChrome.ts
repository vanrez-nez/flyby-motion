import './demoChrome.css';

type DemoKey = 'arrive' | 'repel' | 'orbit' | 'pursue' | 'three';

const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

const links: Array<{
  key: DemoKey;
  label: string;
  href: string;
}> = [
  { key: 'arrive', label: 'Arrive / Attract', href: '/demos/2d/index.html' },
  { key: 'repel', label: 'Repel / Flee', href: '/demos/repel/index.html' },
  { key: 'orbit', label: 'Orbit', href: '/demos/orbit/index.html' },
  { key: 'pursue', label: 'Pursue', href: '/demos/pursue/index.html' },
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
