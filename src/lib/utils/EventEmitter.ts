export type EventHandler = (...args: unknown[]) => void;

export class EventEmitter {
  private _listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this._listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const h of [...handlers]) h(...args);
  }
}
