/**
 * Flyby Motion — library entry point
 */
export { Agent, getForceLabel } from './lib/Agent';
export type { Force, World, AgentOptions } from './lib/Agent';
export { step } from './lib/step';
export * as forces from './lib/forces';
export { falloff } from './lib/falloff';
export type { FalloffFn } from './lib/falloff';
export * as modifiers from './lib/modifiers';
export * as behaviors from './lib/behaviors';
export * as events from './lib/extensions/events';
export * as spatial from './lib/extensions/spatial';
export { Vector2 } from './lib/utils/Vector2';
export { Vector3 } from './lib/utils/Vector3';
export * as Vector2Fn from './lib/utils/Vector2Fn';
export * as Vector3Fn from './lib/utils/Vector3Fn';
