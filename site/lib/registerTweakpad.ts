import {
  defineElement,
  TpButton,
  TpButtonGroup,
  TpCodeBlock,
  TpCollapsible,
  TpCommandPalette,
  TpDrawer,
  TpIcon,
  TpKeyHint,
  TpKeyHintGroup,
  TpMarkdown,
  TpMoTextStroke,
  TpScrollArea,
  TpScrollTrigger,
  TpStatusDot,
  TpTableOfContents,
  TpTableOfContentsItem,
  TpThemeSwitcher,
} from '@tweakpad/ui';

/**
 * Defines only the Tweakpad UI elements this site renders, the same way `@tweakpad/ui/register`
 * does for every element. `defineElement` also defines each element's own dependencies
 * (the command palette's dialog, the tree's checkbox…), so nothing they render is left undefined.
 * Add a class here before using a new `<tp-*>` tag (and its name in tweakpad-jsx.d.ts).
 */
const elements = [
  TpButton,
  TpButtonGroup,
  TpCodeBlock,
  TpCollapsible,
  TpCommandPalette,
  TpDrawer,
  TpIcon,
  TpKeyHint,
  TpKeyHintGroup,
  TpMarkdown,
  TpMoTextStroke,
  TpScrollArea,
  TpScrollTrigger,
  TpStatusDot,
  TpTableOfContents,
  TpTableOfContentsItem,
  TpThemeSwitcher,
] as const;

for (const element of elements) {
  defineElement(element.tagName, element);
}
