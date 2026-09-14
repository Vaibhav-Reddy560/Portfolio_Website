import { BLINK_DROP_RATIO, EAR_BASELINE_DECAY } from './constants';

/**
 * Watches a stream of eye-aspect-ratio samples and reports when a blink has
 * been seen.
 *
 * The baseline is that person's own open-eye ratio, learned live and decayed
 * slowly so it follows them as they move nearer or further from the camera.
 * A blink is then a *relative* collapse against that baseline rather than a
 * fixed cutoff — face-api's eye landmarks are noisy enough that an absolute
 * threshold either never fires for some faces or fires constantly for others.
 *
 * A few frames of warm-up are required before any blink can register, so the
 * very first sample can't be mistaken for one before a baseline exists.
 */
export function createBlinkDetector() {
  let baseline = 0;
  let frames = 0;
  let blinked = false;

  return {
    observe(ear: number) {
      frames += 1;
      baseline = Math.max(baseline * EAR_BASELINE_DECAY, ear);
      const eyesOpen = ear >= baseline * BLINK_DROP_RATIO;
      if (frames > 5 && !eyesOpen) blinked = true;
      return { eyesOpen, blinked };
    },
  };
}
