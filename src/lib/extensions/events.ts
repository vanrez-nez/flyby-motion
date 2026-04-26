export type { EventHandler } from '../utils/EventEmitter';
export { EventEmitter } from '../utils/EventEmitter';

/**
 * Events fired on Agent instances:
 *
 * 'step:before'        — (agent, world, t, dt) before contributors run
 * 'step:after'         — (agent, world, t, dt) after position is updated
 * 'force:applied'      — (totalForce: number[]) after force clamping (debug)
 * 'contributor:added'  — (contributor) when agent.add() is called
 * 'contributor:removed'— (contributor) when agent.remove() or clear() is called
 */
