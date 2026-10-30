export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Resolves with an element's size once it has laid out: non-zero, and unchanged across two
 * animation frames. The demo canvases sit in a Resizable panel group that sizes its panels after
 * the first paint (and may restore a saved split), so measuring on mount reads 0 or a transient size.
 * Rejects with an AbortError when `signal` aborts first (the component unmounted).
 */
export function waitForStableSize(element: HTMLElement, signal: AbortSignal): Promise<ElementSize> {
  return new Promise((resolve, reject) => {
    let last = '';
    let frame = 0;

    const finish = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      finish();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const check = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const size = `${width}x${height}`;
      if (width > 0 && height > 0 && size === last) {
        finish();
        resolve({ width, height });
        return;
      }
      last = size;
      frame = requestAnimationFrame(check);
    };

    // Layout changes (the panel group settling) restart the check; it settles one frame after them.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      last = '';
      frame = requestAnimationFrame(check);
    });

    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', onAbort);
    observer.observe(element);
    frame = requestAnimationFrame(check);
  });
}
