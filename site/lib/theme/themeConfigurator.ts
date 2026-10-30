import { Pane } from 'tweakpane';
import { DEFAULT_THEME, ROLES, SCHEMES, themePresets, themeVar, type Scheme, type SchemeColors } from './presets';

/**
 * A development tool for choosing the site's colors: a floating Tweakpane panel over every page,
 * with the presets and a color picker for each base color of both schemes. Changes apply live (the
 * page CSS and the 3D scene both read the base colors) and persist in localStorage across reloads.
 * "Copy CSS" copies the base-color block to paste into styles/colors.css, which is what ships;
 * "Reset" drops the overrides and shows colors.css again.
 *
 * Loaded only in development (main.tsx), so neither it nor Tweakpane reaches the built site.
 */

const STORAGE_KEY = 'flyby-motion:theme';
const CUSTOM = 'custom';

interface ThemeState {
  preset: string;
  light: SchemeColors;
  dark: SchemeColors;
}

const fromPreset = (id: string): ThemeState => {
  const preset = themePresets.find((p) => p.id === id) ?? DEFAULT_THEME;
  return { preset: preset.id, light: { ...preset.light }, dark: { ...preset.dark } };
};

/** Copies a preset into the state in place: the pane's bindings hold the scheme objects. */
const usePreset = (state: ThemeState, id: string) => {
  const next = fromPreset(id);
  state.preset = next.preset;
  Object.assign(state.light, next.light);
  Object.assign(state.dark, next.dark);
};

function load(): ThemeState | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ThemeState | null;
    return stored?.light && stored?.dark ? stored : null;
  } catch {
    return null;
  }
}

/** The preset whose colors these are, or `custom` once any color differs from every preset. */
function matchPreset(state: ThemeState): string {
  const same = (a: SchemeColors, b: SchemeColors) => ROLES.every((role) => a[role].toLowerCase() === b[role].toLowerCase());
  return themePresets.find((p) => same(p.light, state.light) && same(p.dark, state.dark))?.id ?? CUSTOM;
}

function toCss(state: ThemeState): string {
  const name = themePresets.find((p) => p.id === state.preset)?.name ?? 'Custom';
  const lines = SCHEMES.flatMap((scheme) => ROLES.map((role) => `  ${themeVar(scheme, role)}: ${state[scheme][role]};`));
  return `  /* Base colors: "${name}". */\n${lines.join('\n')}`;
}

export function mountThemeConfigurator(): () => void {
  const root = document.documentElement;
  const stored = load();
  const state: ThemeState = stored ?? fromPreset(DEFAULT_THEME.id);

  // Inline on <html>: wins over colors.css, and the 3D scene's observer of the `style` attribute
  // recolors the scene on every change.
  const apply = () => {
    for (const scheme of SCHEMES) {
      for (const role of ROLES) root.style.setProperty(themeVar(scheme, role), state[scheme][role]);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or blocked storage: the theme still applies for this visit.
    }
  };
  const clear = () => {
    for (const scheme of SCHEMES) {
      for (const role of ROLES) root.style.removeProperty(themeVar(scheme, role));
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored to remove.
    }
  };
  if (stored) apply();

  const container = document.createElement('div');
  container.className = 'theme-configurator';
  Object.assign(container.style, { position: 'fixed', left: '12px', bottom: '12px', width: '260px', zIndex: '1000' });
  document.body.appendChild(container);

  const pane = new Pane({ title: 'Theme', expanded: false, container });
  // Set while the pane itself rewrites the bindings, so those writes don't count as edits.
  let syncing = false;
  const sync = () => {
    syncing = true;
    pane.refresh();
    syncing = false;
  };

  const options: Record<string, string> = Object.fromEntries(themePresets.map((p) => [p.name, p.id]));
  options.Custom = CUSTOM;
  pane.addBinding(state, 'preset', { label: 'preset', options }).on('change', ({ value }) => {
    if (syncing || value === CUSTOM) return;
    usePreset(state, value);
    apply();
    sync();
  });

  for (const scheme of ['dark', 'light'] as Scheme[]) {
    const folder = pane.addFolder({ title: scheme === 'dark' ? 'Dark' : 'Light' });
    for (const role of ROLES) {
      folder.addBinding(state[scheme], role).on('change', () => {
        if (syncing) return;
        state.preset = matchPreset(state);
        apply();
        sync();
      });
    }
  }

  const copy = pane.addButton({ title: 'Copy CSS' });
  copy.on('click', () => {
    void navigator.clipboard.writeText(toCss(state)).then(() => {
      copy.title = 'Copied: paste into colors.css';
      window.setTimeout(() => { copy.title = 'Copy CSS'; }, 1600);
    });
  });
  pane.addButton({ title: 'Reset to colors.css' }).on('click', () => {
    clear();
    usePreset(state, DEFAULT_THEME.id);
    sync();
  });

  return () => {
    pane.dispose();
    container.remove();
  };
}
