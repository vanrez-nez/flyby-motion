import { describe, expect, it } from 'vitest';
import colorsCss from '../../../styles/colors.css?raw';
import { DEFAULT_THEME, ROLES, SCHEMES, themePresets, themeVar } from '../presets';

describe('theme presets', () => {
  it('ships the default preset as the base colors in colors.css', () => {
    for (const scheme of SCHEMES) {
      for (const role of ROLES) {
        const match = colorsCss.match(new RegExp(`${themeVar(scheme, role)}:\\s*(#[0-9a-f]{6});`, 'i'));
        expect(match?.[1].toLowerCase(), themeVar(scheme, role)).toBe(DEFAULT_THEME[scheme][role]);
      }
    }
  });

  it('has five presets with unique ids and six hex colors each', () => {
    expect(themePresets).toHaveLength(5);
    expect(new Set(themePresets.map((p) => p.id)).size).toBe(5);
    for (const preset of themePresets) {
      for (const scheme of SCHEMES) {
        for (const role of ROLES) expect(preset[scheme][role]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
