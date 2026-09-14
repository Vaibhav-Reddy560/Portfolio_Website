import {
  BLINK_DROP_RATIO,
  EAR_BASELINE_DECAY,
  LIVENESS_EAR_RANGE,
  LIVENESS_GEOMETRY_RANGE,
  LIVENESS_CHUNKS,
  LIVENESS_MIN_FRAMES,
  LIVENESS_WINDOW_FRAMES,
} from './constants';

export type Point = { x: number; y: number };

/** Landmark indices (68-point scheme): outer eye corners and the eye lines. */
const LEFT_EYE_OUTER = 36;
const RIGHT_EYE_OUTER = 45;

/**
 * Re-expresses landmarks relative to the face itself: origin at the midpoint
 * between the outer eye corners, scaled by inter-ocular distance, and rotated
 * so the eye line is level.
 *
 * This is what makes the check hard to fool. Translating, zooming or tilting
 * a photograph in front of the camera changes the raw landmark coordinates a
 * lot, but changes these normalised ones not at all — a rigid object stays
 * rigid. Only a face that deforms produces movement here.
 */
function normalize(positions: Point[]): number[] {
  const left = positions[LEFT_EYE_OUTER];
  const right = positions[RIGHT_EYE_OUTER];
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const scale = Math.hypot(dx, dy);
  if (!scale) return [];

  // Undo the roll of the head, so a tilted photo doesn't read as movement.
  const cos = dx / scale;
  const sin = dy / scale;

  const out: number[] = [];
  for (const point of positions) {
    const px = (point.x - cx) / scale;
    const py = (point.y - cy) / scale;
    out.push(px * cos + py * sin, -px * sin + py * cos);
  }
  return out;
}

function range(values: number[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

/**
 * Watches a stream of face landmarks and decides whether it is looking at a
 * living face, without asking the person to do anything.
 *
 * Reports `eyesOpen` too, so callers can avoid capturing a descriptor from a
 * frame caught mid-blink.
 */
export function createLivenessDetector() {
  const geometry: number[][] = [];
  const ears: number[] = [];
  let baseline = 0;
  let live = false;

  return {
    observe(positions: Point[], ear: number) {
      baseline = Math.max(baseline * EAR_BASELINE_DECAY, ear);
      const eyesOpen = ear >= baseline * BLINK_DROP_RATIO;

      const normalized = normalize(positions);
      if (normalized.length) {
        geometry.push(normalized);
        ears.push(ear);
        if (geometry.length > LIVENESS_WINDOW_FRAMES) geometry.shift();
        if (ears.length > LIVENESS_WINDOW_FRAMES) ears.shift();
      }

      if (!live && geometry.length >= LIVENESS_MIN_FRAMES) {
        // Measured across chunk averages rather than raw frames. Landmark and
        // sensor noise is independent frame to frame, so averaging cancels it
        // (by roughly the square root of the chunk size), while genuine facial
        // movement is smooth and survives. Without this, a grainy camera
        // pointed at a photograph produces enough jitter to look alive.
        const chunkSize = Math.floor(geometry.length / LIVENESS_CHUNKS);
        const coords = geometry[0].length;
        const chunkMeans: number[][] = [];
        for (let c = 0; c < LIVENESS_CHUNKS; c += 1) {
          const frames = geometry.slice(c * chunkSize, (c + 1) * chunkSize);
          const mean = new Array<number>(coords).fill(0);
          for (const frame of frames) {
            for (let i = 0; i < coords; i += 1) mean[i] += frame[i] / frames.length;
          }
          chunkMeans.push(mean);
        }

        let total = 0;
        for (let i = 0; i < coords; i += 1) {
          total += range(chunkMeans.map((mean) => mean[i]));
        }
        const geometryRange = total / coords;
        const earRange = range(ears);

        if (geometryRange > LIVENESS_GEOMETRY_RANGE || earRange > LIVENESS_EAR_RANGE) {
          live = true;
        }
      }

      return { live, eyesOpen };
    },
  };
}
