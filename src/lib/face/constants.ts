/** Where the self-hosted face-api.js model weights live (see public/models). */
export const FACE_MODEL_URL = '/models';

/**
 * Euclidean distance below which two 128-d face descriptors are considered
 * the same person. face-api.js's own docs describe 0.4-0.6 as the practical
 * match range; 0.5 sits in the middle rather than favoring false-accepts or
 * false-rejects.
 */
export const FACE_MATCH_THRESHOLD = 0.5;

/**
 * A blink is the eye aperture collapsing to this fraction of *that person's
 * own* open-eye baseline, which is measured live from the first frames.
 *
 * A fixed absolute threshold does not survive contact with reality here:
 * face-api's 68-point eye landmarks are noisy, and the raw ratio shifts with
 * face shape, distance from the camera, and lighting — on some faces it never
 * dips below a hardcoded cutoff even with eyes fully shut. A relative drop is
 * stable across all of that, and a photo held up to the camera still can't
 * produce one, which is the whole point of the check.
 */
export const BLINK_DROP_RATIO = 0.8;

/**
 * Detector input size while watching for a blink, versus at the moment of
 * capture. The detector dominates per-frame cost and scales with input area:
 * measured on a slow headless backend, 224 runs at ~10fps where the library
 * default of 416 managed ~1fps — far too slow to ever sample the ~120ms
 * window when an eye is actually shut. Capture happens once, so it can
 * afford the more accurate larger input.
 */
export const LIVENESS_INPUT_SIZE = 224;
export const CAPTURE_INPUT_SIZE = 320;

/** How fast the open-eye baseline decays per frame, so it tracks movement. */
export const EAR_BASELINE_DECAY = 0.995;

/**
 * If no blink is caught within this long, offer a head-turn challenge
 * instead. Blink detection depends on the camera's frame rate and the
 * landmark model's precision, neither of which is guaranteed on an
 * arbitrary device — this keeps Face ID usable rather than stranding
 * someone at a prompt their hardware can't satisfy.
 */
export const LIVENESS_FALLBACK_MS = 10_000;

/** Yaw swing (nose offset / inter-ocular distance) accepted as a head turn. */
export const YAW_TURN_DELTA = 0.18;

/** Samples averaged together at enrollment time, to smooth out one bad frame. */
export const ENROLL_SAMPLE_COUNT = 3;

export const FACE_DESCRIPTOR_LENGTH = 128;
