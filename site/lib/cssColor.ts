/**
 * Theme colors for canvases (the landing scene, the demos): CSS custom properties resolved to
 * colors a renderer understands, and the scheme the page is showing.
 */

/**
 * Resolves a CSS color custom property (including `light-dark()` pairs) to the rgb string the
 * browser computes for it, by reading it back from a hidden probe inside `element`.
 */
export function resolveCssColor(element: HTMLElement, property: string, fallback: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${property}, ${fallback})`;
  probe.style.display = 'none';
  element.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || getComputedStyle(element).getPropertyValue(property).trim() || fallback;
}

/** Whether the page shows its dark scheme: the theme switcher's choice, or the system's. */
export function isDarkScheme(): boolean {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}
