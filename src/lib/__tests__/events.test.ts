import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';

const W = {};

describe('EventEmitter (on / off / emit)', () => {
  it('on() returns an unsubscribe function', () => {
    const a = new Agent();
    const fn = vi.fn();
    const off = a.on('test', fn);
    a.emit('test');
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    a.emit('test');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off() removes a specific handler', () => {
    const a = new Agent();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    a.on('x', fn1);
    a.on('x', fn2);
    a.off('x', fn1);
    a.emit('x');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('emit passes all args to handler', () => {
    const a = new Agent();
    const fn = vi.fn();
    a.on('foo', fn);
    a.emit('foo', 1, 'hello', [1, 2]);
    expect(fn).toHaveBeenCalledWith(1, 'hello', [1, 2]);
  });

  it('removing a listener during emit does not skip remaining listeners', () => {
    const a = new Agent();
    const order: string[] = [];
    const fn1 = () => { order.push('fn1'); a.off('e', fn2); };
    const fn2 = () => { order.push('fn2'); };
    a.on('e', fn1);
    a.on('e', fn2);
    a.emit('e');
    expect(order).toEqual(['fn1', 'fn2']); // fn2 still ran
  });

  it('emitting an event with no listeners is a no-op', () => {
    const a = new Agent();
    expect(() => a.emit('nonexistent')).not.toThrow();
  });
});

describe('force events', () => {
  it('force:added fires on agent.add()', () => {
    const a = new Agent();
    const fn = vi.fn();
    a.on('force:added', fn);
    const c = () => [0, 0];
    a.add(c);
    expect(fn).toHaveBeenCalledWith(c);
  });

  it('force:removed fires on agent.remove()', () => {
    const a = new Agent();
    const fn = vi.fn();
    const c = () => [0, 0];
    a.add(c);
    a.on('force:removed', fn);
    a.remove(c);
    expect(fn).toHaveBeenCalledWith(c);
  });

  it('force:removed does not fire for unknown force', () => {
    const a = new Agent();
    const fn = vi.fn();
    a.on('force:removed', fn);
    a.remove(() => [0, 0]); // not in set
    expect(fn).not.toHaveBeenCalled();
  });

  it('force:removed fires for each on agent.clear()', () => {
    const a = new Agent();
    const fn = vi.fn();
    const c1 = () => [0, 0];
    const c2 = () => [1, 0];
    a.add(c1);
    a.add(c2);
    a.on('force:removed', fn);
    a.clear();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('step lifecycle events', () => {
  it('step:before fires before forces run', () => {
    const order: string[] = [];
    const a = new Agent();
    a.on('step:before', () => order.push('before'));
    a.add(() => { order.push('force-fn'); return [0, 0]; });
    step(a, W, 0, 0.016);
    expect(order[0]).toBe('before');
    expect(order[1]).toBe('force-fn');
  });

  it('step:after fires after integration', () => {
    const order: string[] = [];
    const positions: number[] = [];
    const a = new Agent({ position: [0, 0] });
    a.add(() => [1, 0]);
    a.on('step:before', () => { order.push('before'); positions.push(a.position[0]); });
    a.on('step:after', () => { order.push('after'); positions.push(a.position[0]); });
    step(a, W, 0, 0.016);
    expect(order).toEqual(['before', 'after']);
    // position in step:after should be updated (greater than in step:before)
    expect(positions[1]).toBeGreaterThan(positions[0]);
  });

  it('force:applied fires with the clamped force vector', () => {
    const a = new Agent({ maxForce: 1 });
    a.add(() => [100, 0]);
    const forces: number[][] = [];
    a.on('force:applied', (f) => forces.push(f as number[]));
    step(a, W, 0, 0.016);
    expect(forces.length).toBe(1);
    // clamped to maxForce=1
    const magnitude = Math.sqrt(forces[0][0] ** 2 + forces[0][1] ** 2);
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('force:applied receives a copy (not the internal array)', () => {
    const a = new Agent();
    a.add(() => [2, 0]);
    let captured: unknown;
    a.on('force:applied', (f) => { captured = f; });
    step(a, W, 0, 0.016);
    expect(captured).toEqual([2, 0]);
  });

  it('step:before receives correct args', () => {
    const a = new Agent();
    const calls: unknown[][] = [];
    a.on('step:before', (...args) => calls.push(args));
    step(a, W, 5, 0.032);
    expect(calls[0][0]).toBe(a);
    expect(calls[0][1]).toBe(W);
    expect(calls[0][2]).toBe(5);
    expect(calls[0][3]).toBe(0.032);
  });

  it('event order: step:before -> forces -> force:applied -> step:after', () => {
    const order: string[] = [];
    const a = new Agent();
    a.on('step:before', () => order.push('before'));
    a.add(() => { order.push('force-fn'); return [0, 0]; });
    a.on('force:applied', () => order.push('force-event'));
    a.on('step:after', () => order.push('after'));
    step(a, W, 0, 0.016);
    expect(order).toEqual(['before', 'force-fn', 'force-event', 'after']);
  });
});
