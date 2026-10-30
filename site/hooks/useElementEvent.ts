import { useEffect, useRef, type RefObject } from 'react';

/**
 * Listens for a (custom) DOM event on an element, such as Tweakpad's `tp-action` or `tp-execute`.
 * The latest handler is always called, without re-binding the listener on every render.
 */
export function useElementEvent<E extends Event = CustomEvent>(
  ref: RefObject<HTMLElement | null>,
  type: string,
  handler: (event: E) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = (event: Event) => handlerRef.current(event as E);
    element.addEventListener(type, listener);
    return () => element.removeEventListener(type, listener);
  }, [ref, type]);
}
