const POINTER_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'click',
  'dblclick',
  'contextmenu',
  'wheel',
] as const;

// Stops mouse / touch / wheel events from bubbling past `element` so they
// can't reach canvas-level listeners (PIXI stage, OrbitControls, etc.) when
// the user is interacting with chrome layered over the playground.
export function stopCanvasPassthrough(element: HTMLElement): void {
  const stop = (event: Event) => event.stopPropagation();
  POINTER_EVENTS.forEach((type) => {
    element.addEventListener(type, stop);
  });
}
