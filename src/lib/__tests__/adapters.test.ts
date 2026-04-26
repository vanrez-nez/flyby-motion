import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../Agent';
import { step } from '../step';
import { syncThree, syncPixi, syncDom } from '../adapters';

const W = {};

// ─── syncThree ────────────────────────────────────────────────────────────────

describe('syncThree', () => {
  const makeObject = () => ({ position: { set: vi.fn() } });

  it('syncs initial position immediately on setup', () => {
    const agent = new Agent({ position: [10, 20, 30] });
    const obj = makeObject();
    syncThree(agent, obj as any);
    expect(obj.position.set).toHaveBeenCalledWith(10, 20, 30);
  });

  it('updates after each step', () => {
    const agent = new Agent({ position: [0, 0, 0] });
    agent.add(() => [1, 0, 0]);
    const obj = makeObject();
    syncThree(agent, obj as any);
    obj.position.set.mockClear();
    step(agent, W, 0, 1);
    expect(obj.position.set).toHaveBeenCalled();
    const [x] = obj.position.set.mock.calls.at(-1)!;
    expect(x).toBeGreaterThan(0);
  });

  it('returned function stops syncing', () => {
    const agent = new Agent({ position: [0, 0] });
    const obj = makeObject();
    const unsync = syncThree(agent, obj as any);
    obj.position.set.mockClear();
    unsync();
    step(agent, W, 0, 0.016);
    expect(obj.position.set).not.toHaveBeenCalled();
  });

  it('applies scale option', () => {
    const agent = new Agent({ position: [10, 20, 30] });
    const obj = makeObject();
    syncThree(agent, obj as any, { scale: 0.01 });
    expect(obj.position.set).toHaveBeenCalledWith(0.1, 0.2, 0.3);
  });

  it('defaults z to 0 for 2D agents', () => {
    const agent = new Agent({ position: [5, 7] });
    const obj = makeObject();
    syncThree(agent, obj as any);
    expect(obj.position.set).toHaveBeenCalledWith(5, 7, 0);
  });

  it('does not mutate agent state', () => {
    const agent = new Agent({ position: [1, 2, 3] });
    const obj = makeObject();
    syncThree(agent, obj as any);
    step(agent, W, 0, 0.016);
    expect(agent.position).not.toBe(obj.position);
  });
});

// ─── syncPixi ─────────────────────────────────────────────────────────────────

describe('syncPixi', () => {
  const makeSprite = () => ({ x: 0, y: 0 });

  it('syncs initial position immediately on setup', () => {
    const agent = new Agent({ position: [30, 50] });
    const sprite = makeSprite();
    syncPixi(agent, sprite);
    expect(sprite.x).toBe(30);
    expect(sprite.y).toBe(50);
  });

  it('updates x and y from first two position components', () => {
    const agent = new Agent({ position: [0, 0] });
    agent.add(() => [2, 3]);
    const sprite = makeSprite();
    syncPixi(agent, sprite);
    step(agent, W, 0, 1);
    expect(sprite.x).toBeGreaterThan(0);
    expect(sprite.y).toBeGreaterThan(0);
  });

  it('returned function stops syncing', () => {
    const agent = new Agent({ position: [0, 0] });
    agent.add(() => [1, 0]);
    const sprite = makeSprite();
    const unsync = syncPixi(agent, sprite);
    unsync();
    step(agent, W, 0, 1);
    expect(sprite.x).toBe(0); // unchanged after unsync
  });

  it('ignores z component of 3D agents', () => {
    const agent = new Agent({ position: [4, 5, 999] });
    const sprite = makeSprite();
    syncPixi(agent, sprite);
    expect(sprite.x).toBe(4);
    expect(sprite.y).toBe(5);
    expect((sprite as any).z).toBeUndefined();
  });

  it('does not mutate agent state', () => {
    const agent = new Agent({ position: [1, 2] });
    const sprite = makeSprite();
    const origRef = agent.position;
    syncPixi(agent, sprite);
    // adapter must not replace or alter the agent's position array
    expect(agent.position).toBe(origRef);
    expect(agent.position[0]).toBe(1);
    expect(agent.position[1]).toBe(2);
  });
});

// ─── syncDom ──────────────────────────────────────────────────────────────────

describe('syncDom', () => {
  const makeElement = () => ({ style: { transform: '' } } as unknown as HTMLElement);

  it('syncs initial position immediately on setup', () => {
    const agent = new Agent({ position: [15, 25] });
    const el = makeElement();
    syncDom(agent, el);
    expect(el.style.transform).toBe('translate(15px, 25px)');
  });

  it('sets CSS transform after each step', () => {
    const agent = new Agent({ position: [0, 0] });
    agent.add(() => [10, 5]);
    const el = makeElement();
    syncDom(agent, el);
    step(agent, W, 0, 1);
    expect(el.style.transform).toMatch(/translate\(/);
    expect(el.style.transform).toContain('px');
  });

  it('returned function stops syncing', () => {
    const agent = new Agent({ position: [0, 0] });
    agent.add(() => [1, 0]);
    const el = makeElement();
    const unsync = syncDom(agent, el);
    unsync();
    step(agent, W, 0, 1);
    expect(el.style.transform).toBe('translate(0px, 0px)'); // unchanged
  });

  it('does not mutate agent state', () => {
    const agent = new Agent({ position: [3, 7] });
    const el = makeElement();
    syncDom(agent, el);
    step(agent, W, 0, 0.016);
    expect(agent.position).toHaveLength(2);
    expect(agent.velocity).toHaveLength(2);
  });
});
