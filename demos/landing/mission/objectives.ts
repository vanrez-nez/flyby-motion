import type { BeaconState } from './markers';
import type { Waypoint } from './world';

/** How close (ground distance, m) the drone must get for a waypoint to count as reached. */
export const REACHED_RADIUS = 5;

/**
 * Tracks which waypoints the drone has reached in the current loop. A waypoint is `active` while
 * it is the phase's objective and not yet reached, `reached` once the drone has been within
 * REACHED_RADIUS of it or the mission has moved on to the next objective (`arrive` eases in, so
 * the drone can still be a few metres short when its phase ends), `pending` otherwise. Reached
 * waypoints stay reached for the rest of the loop; `onReached` fires once for each.
 */
export function createObjectives(waypoints: Waypoint[], onReached: (waypoint: Waypoint) => void) {
  const reached = new Set<string>();
  let current: string | null = null;

  const reach = (waypoint: Waypoint) => {
    if (reached.has(waypoint.id)) return;
    reached.add(waypoint.id);
    onReached(waypoint);
  };

  return {
    /** Clears progress at the start of each loop. */
    reset() {
      reached.clear();
      current = null;
    },
    update(drone: number[], objectiveId: string | null): Map<string, BeaconState> {
      const states = new Map<string, BeaconState>();
      for (const waypoint of waypoints) {
        const [x, , z] = waypoint.position;
        const close = Math.hypot(drone[0] - x, drone[2] - z) <= REACHED_RADIUS;
        if ((waypoint.id === objectiveId && close) || (waypoint.id === current && current !== objectiveId)) {
          reach(waypoint);
        }
        states.set(
          waypoint.id,
          reached.has(waypoint.id) ? 'reached' : waypoint.id === objectiveId ? 'active' : 'pending',
        );
      }
      current = objectiveId;
      return states;
    },
  };
}
