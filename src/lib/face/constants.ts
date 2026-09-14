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
 * Eye-aspect-ratio (Soukupová & Čech, 2016) below this counts as "closed".
 * A blink is a dip below this value followed by a recovery above it — proof
 * of life against a printed photo or a phone screen held up to the camera.
 */
export const EAR_BLINK_THRESHOLD = 0.23;

/** Samples averaged together at enrollment time, to smooth out one bad frame. */
export const ENROLL_SAMPLE_COUNT = 3;

export const FACE_DESCRIPTOR_LENGTH = 128;
