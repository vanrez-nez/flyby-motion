import React, { useLayoutEffect, useRef } from 'react';

/**
 * `<tp-key-hint key="mod">` cannot be written in JSX: React reserves `key` and never passes it
 * to the element. This sets the element's `key` property directly (`mod` is ⌘ on macOS, Ctrl elsewhere).
 */
export const KeyHint: React.FC<{ keyName?: string; children?: React.ReactNode }> = ({ keyName, children }) => {
  const ref = useRef<HTMLElement & { key?: string }>(null);

  useLayoutEffect(() => {
    if (ref.current && keyName) ref.current.key = keyName;
  }, [keyName]);

  return <tp-key-hint ref={ref}>{children}</tp-key-hint>;
};
