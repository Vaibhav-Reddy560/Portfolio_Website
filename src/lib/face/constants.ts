/** Where the self-hosted face-api.js model weights live (see public/models). */
export const FACE_MODEL_URL = '/models';

/**
 * Self-hosted TensorFlow.js WASM binaries (see public/wasm). The version must
 * stay in lockstep with the tfjs bundled inside @vladmandic/face-api — hence
 * the exact pin on @tensorflow/tfjs-backend-wasm in package.json.
 */
export const TFJS_WASM_URL = '/wasm/';

/**
 * Euclidean distance below which two 128-d descriptors are the same person.
 *
 * 0.5 let a different person in. face-api's 0.4-0.6 guidance assumes ONE
 * reference descriptor; sign-in here compares several captured frames against
 * every enrolled view, so the loosest usable single-reference number becomes
 * far too generous once it's the minimum over dozens of comparisons.
 *
 * Measured against a real enrollment: the owner's own 20 views sat 0.090-0.453
 * apart from each other (median 0.321), so a 0.5 cutoff had essentially no
 * margin — a stranger only had to land nearer than the owner's own views do to
 * each other. This sits below that spread while still leaving room for the
 * owner, whose nearest enrolled view should be far closer than any of this.
 */
export const FACE_MATCH_THRESHOLD = 0.36;

/**
 * Fraction of captured frames that must independently match before sign-in is
 * allowed. Taking the single best distance turned every extra frame and every
 * extra enrolled view into another chance to get lucky; requiring agreement
 * means one fluke frame can't carry the whole decision.
 */
export const FACE_MATCH_AGREEMENT = 0.6;

/**
 * Eye aperture below this fraction of the person's own open-eye baseline
 * counts as closed — used only to avoid capturing a descriptor mid-blink,
 * not as a liveness signal.
 */
export const BLINK_DROP_RATIO = 0.8;

/**
 * Passive liveness thresholds.
 *
 * Asking for a deliberate blink did not survive contact with a real face and
 * a real webcam: face-api's eye landmarks are too coarse for the ~120ms
 * window to register reliably, and a challenge the user can't satisfy is
 * worse than no challenge. So liveness is now observed rather than demanded.
 *
 * Landmarks are first normalised for position, scale and rotation, which
 * cancels rigid motion — so waving a printed photo around does not pass.
 * What remains is *internal* geometry change: micro head rotation, eyes,
 * brows, mouth. A real face produces that continuously and involuntarily; a
 * photograph produces none of it.
 *
 * Both signals are checked and either one passing is enough, because the
 * failure mode that matters here is a live person being locked out.
 *
 * The geometry threshold is tuned from measured separation rather than taste:
 * a still photo and a waved/tilted/zoomed photo both land around 0.004
 * (landmark noise only, since normalisation cancels rigid motion), while even
 * very subtle living motion reaches ~0.028. Deliberately biased toward letting
 * a real person in, because locking one out is the worse failure.
 */
export const LIVENESS_GEOMETRY_RANGE = 0.014;
export const LIVENESS_EAR_RANGE = 0.055;

/** Rolling window of frames the liveness signals are measured across. */
export const LIVENESS_WINDOW_FRAMES = 40;

/** Frames required before liveness can be judged at all. */
export const LIVENESS_MIN_FRAMES = 12;

/**
 * The window is averaged into this many consecutive chunks before movement is
 * measured, so frame-to-frame noise cancels but real motion doesn't. Without
 * it, a grainy camera pointed at a photograph jitters enough to look alive.
 */
export const LIVENESS_CHUNKS = 4;

/**
 * Detector input size for the liveness loop, which only needs to track that a
 * face is present and moving. Small and cheap, since it runs every frame.
 */
export const LIVENESS_INPUT_SIZE = 160;

/**
 * Detector input size at the moment of capture, run against the full-
 * resolution camera frame rather than the downscaled loop canvas.
 *
 * Capturing from the small canvas made descriptors measurably worse: views of
 * the same face in the same pose, seconds apart, landed 0.200 apart when they
 * should be far closer. Blurry descriptors drift toward a generic face, which
 * compresses the gap between people and is how a stranger got in. Capture runs
 * only a handful of times, so the extra cost is worth paying for identity
 * accuracy — which is the entire point of the feature.
 */
export const CAPTURE_INPUT_SIZE = 416;

/**
 * Camera frames are drawn down to this size before detection — measurably
 * faster than detecting against the raw 640x480 frame, and the liveness
 * signals are all ratios, so shrinking the frame doesn't affect them.
 */
export const DETECT_WIDTH = 320;
export const DETECT_HEIGHT = 240;

/** How fast the open-eye baseline decays per frame, so it tracks movement. */
export const EAR_BASELINE_DECAY = 0.995;

/**
 * How long to wait, from the first frame a face is actually seen, before
 * softening the status into a hint. It's a hint and not a challenge — the
 * check is passive, so there is nothing for the person to perform.
 */
export const LIVENESS_HINT_MS = 6_000;

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
 * about 8ms apiece on WASM, and gives a bad frame (mid-motion, half-blink) a
 * couple of chances to be beaten by a good one.
 */
export const LOGIN_SAMPLE_COUNT = 3;

/** How far the head must move from its calibrated centre to satisfy a pose. */
export const POSE_YAW_DELTA = 0.09;
export const POSE_PITCH_DELTA = 0.05;

export const FACE_DESCRIPTOR_LENGTH = 128;
