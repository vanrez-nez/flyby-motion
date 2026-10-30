import type { IconDefinition } from '@tweakpad/ui';

export { xIcon } from '@tweakpad/ui/icons/x';
export { copyIcon } from '@tweakpad/ui/icons/copy';
export { chevronDownIcon } from '@tweakpad/ui/icons/chevron-down';

/** Icons the library does not ship, drawn in its 24×24 outline style. */
export const searchIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', strokeWidth: 2 },
    { d: 'm20 20-3.5-3.5', strokeWidth: 2 },
  ],
};

export const githubIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{
    d: 'M12 .3a12 12 0 0 0-3.8 23.38c.6.12.82-.26.82-.57v-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3',
    fill: 'currentColor',
    stroke: 'none',
  }],
};

export const arrowRightIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M5 12h14M13 6l6 6-6 6', strokeWidth: 2 }],
};
