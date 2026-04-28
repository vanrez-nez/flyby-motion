export function observeSize(element: HTMLElement): void {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === element) {
        const { width, height } = entry.contentRect;
        console.log(`[observeSize] element resized to width: ${width}, height: ${height}`);
      }
    }
  });
  
  resizeObserver.observe(element);
}
