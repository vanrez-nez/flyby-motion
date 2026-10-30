import { describe, expect, it } from 'vitest';
import { docsNavGroups, docsPages } from '../docsPages';

describe('docs sidebar groups', () => {
  it('puts the guides under "Guide" and each reference part in its own group, overview first', () => {
    expect(docsNavGroups.map((group) => group.label)).toEqual(['Guide', 'API Reference']);
    expect(docsNavGroups[0].items.map((item) => item.label)).toEqual(['Getting Started']);
    expect(docsNavGroups[1].items.map((item) => item.label)).toEqual([
      'Overview', 'Agent', 'step', 'forces', 'falloff', 'behaviors', 'modifiers', 'Utilities',
    ]);
  });

  it('links every docs page exactly once, in reading order', () => {
    const paths = docsNavGroups.flatMap((group) => group.items.map((item) => item.path));
    expect(paths).toEqual(docsPages.map((page) => page.path));
  });
});
