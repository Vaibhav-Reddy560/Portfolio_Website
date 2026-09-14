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
export const LIVENESS_INPUT_SIZE = 160;
export const CAPTURE_INPUT_SIZE = 320;

/**
 * Camera frames are drawn down to this size before detection. Measured at
 * ~20fps here versus ~15fps detecting against the raw 640x480 frame, which is
 * the difference between a blink spanning about 2.5 frames and about 1.7.
 */
export const DETECT_WIDTH = 320;
export const DETECT_HEIGHT = 240;

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

/**
 * Descriptors captured per head position during enrollment. Every sample is
 * stored in its own row rather than averaged — averaging near-identical
 * frames adds nothing, and averaging genuinely different poses produces a
 * vector that matches neither. Sign-in keeps the closest match across all of
 * them, so more views means a wider range of angles and lighting that still
 * recognises you.
 */
export const ENROLL_SAMPLES_PER_POSE = 4;

/**
 * Frames captured at sign-in, each compared against every stored view. Costs
 * about 120ms apiece once the nets are warm, and gives a bad frame (mid-
 * motion, half-blink) a couple of chances to be beaten by a good one.
 */
export const LOGIN_SAMPLE_COUNT = 3;

/** How far the head must move from its calibrated centre to satisfy a pose. */
export const POSE_YAW_DELTA = 0.09;
export const POSE_PITCH_DELTA = 0.05;

export const FACE_DESCRIPTOR_LENGTH = 128;
