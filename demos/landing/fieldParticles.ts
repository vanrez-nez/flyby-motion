import { Agent, falloff, forces, modifiers, type Force } from '../../src/index';

/**
 * The agents of the landing field. Every particle's motion comes only from library forces:
 * - `forces.attract` + `falloff.arrive` pulls it to its slot in the current formation,
 *   wrapped in `modifiers.fadeIn` so each morph eases in with a per-agent delay,
 * - `forces.drift` adds idle wander, `forces.tangentialAround` a swirl around the y axis
 *   (`modifiers.gate` / `modifiers.scale` quiet both while the logo is shown),
 * - `forces.repel` + `falloff.within` pushes it away from the pointer,
 * - a click adds a short `modifiers.fadeOut` burst, and `forces.damp` keeps it stable.
 */

export const FAR_AWAY = 1e6;
const ATTRACT = { strength: 18, slowR: 2.4 };
const POINTER = { radius: 2.8, strength: 70, rate: 0.6 };
const BURST = { radius: 7, strength: 140, duration: 0.7 };

export interface Particle {
  agent: Agent;
  home: number[];
  attract: Force;
}

function homeForce(home: number[], maxDelay: number): Force {
  return modifiers.fadeIn(
    0.4 + Math.random() * maxDelay,
    forces.attract(() => home, falloff.arrive(ATTRACT.strength, ATTRACT.slowR)),
  );
}

export interface ParticleField {
  particles: Particle[];
  /** Pointer position in the field's local space; park it at FAR_AWAY when inactive. */
  pointer: number[];
  /** Moves every particle's home to the given formation (flat xyz); `calm` quiets swirl and drift. */
  setTargets(points: Float32Array, calm?: boolean): void;
  /** A short outward push from a point, fading out. */
  burst(origin: number[]): void;
  dispose(): void;
}

export function createParticleField(start: Float32Array, count: number, scattered: boolean): ParticleField {
  const pointer = [FAR_AWAY, FAR_AWAY, FAR_AWAY];
  const state = { calm: false };
  const pointerForce = forces.repel(
    () => pointer,
    falloff.within(falloff.exponential(POINTER.strength, POINTER.rate), POINTER.radius),
  );
  // Swirl only while the formation is not "calm" (the logo stays legible); `gate` switches it per step.
  const swirl = modifiers.gate(() => !state.calm, forces.tangentialAround([0, 1, 0], 1.2));
  const damping = forces.damp(1.7);
  const timers = new Set<number>();

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const home = [start[i * 3], start[i * 3 + 1], start[i * 3 + 2]];
    // Start scattered on a far shell, so the field assembles on load.
    const r = 10 + Math.random() * 8;
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 2 - 1);
    const agent = new Agent({
      position: scattered
        ? [r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)]
        : [...home],
      velocity: [0, 0, 0],
      mass: 0.8 + Math.random() * 0.6,
      maxSpeed: 9,
      maxForce: 60,
    });
    const attract = homeForce(home, 1.8);
    const drift = forces.drift({ strength: 2.4, scale: 0.22, seed: Math.random() * 10000 });
    agent.add(attract, { label: 'home' });
    // Full drift normally, a quarter of it while calm.
    agent.add(modifiers.sum(
      modifiers.gate(() => !state.calm, drift),
      modifiers.gate(() => state.calm, modifiers.scale(drift, 0.25)),
    ), { label: 'drift' });
    agent.add(swirl, { label: 'swirl' });
    agent.add(pointerForce, { label: 'pointer' });
    agent.add(damping, { label: 'damp' });
    particles.push({ agent, home, attract });
  }

  return {
    particles,
    pointer,
    setTargets(points, calm = false) {
      state.calm = calm;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.home[0] = points[i * 3];
        particle.home[1] = points[i * 3 + 1];
        particle.home[2] = points[i * 3 + 2];
        // A fresh fadeIn per morph: its clock starts on the first step after it is added.
        particle.agent.remove(particle.attract);
        particle.attract = homeForce(particle.home, 2.2);
        particle.agent.add(particle.attract, { label: 'home' });
      }
    },
    burst(origin) {
      const at = [...origin];
      const force = modifiers.fadeOut(
        BURST.duration,
        forces.repel(() => at, falloff.within(falloff.constant(BURST.strength), BURST.radius)),
      );
      for (const particle of particles) particle.agent.add(force, { label: 'burst' });
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        for (const particle of particles) particle.agent.remove(force);
      }, BURST.duration * 1000 + 50);
      timers.add(timer);
    },
    dispose() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      for (const particle of particles) particle.agent.clear();
    },
  };
}
