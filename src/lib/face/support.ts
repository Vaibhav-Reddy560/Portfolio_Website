/** Feature-detects camera access so Face ID UI never renders where it can't work. */
export function isCameraSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}
