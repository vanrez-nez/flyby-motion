/**
 * Flyby Motion — library entry point
 */
export { Agent } from './lib/Agent';
export type { Contributor, World, AgentOptions } from './lib/Agent';
export { step } from './lib/step';
export * as primitives from './lib/primitives';
export { mag } from './lib/magnitudes';
export * as combinators from './lib/combinators';
export * as compositions from './lib/compositions';
export * as events from './lib/extensions/events';
export * as spatial from './lib/extensions/spatial';
export * as adapters from './lib/adapters';
export { Vector2 } from './lib/utils/Vector2';
export { Vector3 } from './lib/utils/Vector3';
export * as Vector2Fn from './lib/utils/Vector2Fn';
export * as Vector3Fn from './lib/utils/Vector3Fn';
