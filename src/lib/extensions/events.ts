export type { EventHandler } from '../utils/EventEmitter';
export { EventEmitter } from '../utils/EventEmitter';

/**
 * Events fired on Agent instances:
 *
 * 'step:before'        — (agent, world, t, dt) before forces run
 * 'step:after'         — (agent, world, t, dt) after position is updated
 * 'force:applied'      — (totalForce: number[]) after force clamping (debug)
 * 'force:added'        — (force) when agent.add() is called
 * 'force:removed'      — (force) when agent.remove() or clear() is called
 */
