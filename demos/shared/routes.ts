export type DemoKey =
  | 'forces'
  | 'behaviors'
  | 'modifiers'
  | 'custom'
  | 'three-forces'
  | 'three-behaviors'
  | 'three-modifiers'
  | 'three-custom';

export type DemoDimension = '2d' | '3d';

export interface DemoLink {
  key: DemoKey;
  label: string;
  path: string;
}

export const demoLinks: Record<DemoDimension, DemoLink[]> = {
  '2d': [
    { key: 'forces', label: 'Forces', path: '/2d/forces' },
    { key: 'behaviors', label: 'Behaviors', path: '/2d/behaviors' },
    { key: 'modifiers', label: 'Modifiers', path: '/2d/modifiers' },
    { key: 'custom', label: 'Custom', path: '/2d/custom' },
  ],
  '3d': [
    { key: 'three-forces', label: 'Forces', path: '/3d/forces' },
    { key: 'three-behaviors', label: 'Behaviors', path: '/3d/behaviors' },
    { key: 'three-modifiers', label: 'Modifiers', path: '/3d/modifiers' },
    { key: 'three-custom', label: 'Custom', path: '/3d/custom' },
  ],
};

export const GITHUB_URL = 'https://github.com/vanrez-nez/flyby-motion';

/** Base path the site is served from, without a trailing slash ('' in dev, '/flyby-motion' on GitHub Pages). */
export const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

/** Prefixes an app path such as `/docs` with the base path, so links survive a reload on GitHub Pages. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Strips the base path and `index.html` from a pathname, giving the app route. */
export function toRoute(pathname: string): string {
  let route = BASE_PATH && pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname;
  if (route.endsWith('/index.html')) route = route.slice(0, -'/index.html'.length) || '/';
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
  return route;
}

/** Client-side navigation to an app path (optionally with a `#fragment`). */
export function navigate(path: string): void {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function demoDimension(key: DemoKey | undefined): DemoDimension {
  return key?.startsWith('three-') ? '3d' : '2d';
}

/** The same demo in the other dimension: Forces 2D ↔ Forces 3D. */
export function counterpartPath(key: DemoKey | undefined, dimension: DemoDimension): string {
  const current = demoLinks[demoDimension(key)].findIndex((link) => link.key === key);
  return demoLinks[dimension][Math.max(0, current)].path;
}
