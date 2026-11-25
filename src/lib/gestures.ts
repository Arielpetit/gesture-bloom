import type { GestureType } from '@/types/particle';

export type Landmark = { x: number; y: number; z: number };

const dist3 = (a: Landmark, b: Landmark) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
const dist2 = (a: Landmark, b: Landmark) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

/** A finger is extended when its tip is clearly further from the wrist than its PIP joint. */
export function isFingerExtended(lm: Landmark[], tipIdx: number, pipIdx: number): boolean {
  return dist3(lm[tipIdx], lm[0]) > dist3(lm[pipIdx], lm[0]) * 1.1;
}

/** The thumb is extended when its tip is spread sideways away from the index knuckle. */
export function isThumbExtended(lm: Landmark[]): boolean {
  const palmWidth = Math.abs(lm[5].x - lm[17].x);
  return Math.abs(lm[4].x - lm[5].x) > palmWidth * 0.5;
}

/** Classify a 21-point MediaPipe hand into one of the app's gestures. */
export function detectGesture(lm: Landmark[]): GestureType {
  const thumb = isThumbExtended(lm);
  const index = isFingerExtended(lm, 8, 6);
  const middle = isFingerExtended(lm, 12, 10);
  const ring = isFingerExtended(lm, 16, 14);
  const pinky = isFingerExtended(lm, 20, 18);
  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;

  const thumbIsUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y && lm[4].y < lm[5].y;

  if (index && middle && !ring && !pinky) {
    if (dist2(lm[8], lm[12]) > dist2(lm[5], lm[17]) * 0.2) return 'peace';
  }
  if (thumbIsUp && !index && !middle && !ring && !pinky) return 'thumbUp';
  if (index && !middle && !ring && !pinky) return 'pointing';
  if (dist2(lm[4], lm[8]) < 0.05 && middle && ring && pinky) return 'okSign';
  // Rock wins over iLoveYou on purpose: people often leave the thumb out when making it.
  if (index && !middle && !ring && pinky) return 'rock';
  if (thumb && pinky && !index && !middle && !ring) return 'callMe';
  if (extendedCount >= 3) return 'open';
  if (middle && !index && !ring && !pinky && !thumb) return 'middleFinger';
  if (extendedCount === 0 && !thumb) return 'fist';
  return 'none';
}

/** 0 = closed fist, 1 = fully open hand. */
export function handOpenness(lm: Landmark[]): number {
  const tips = [4, 8, 12, 16, 20];
  const bases = [2, 5, 9, 13, 17];
  let total = 0;
  for (let i = 0; i < 5; i++) {
    total += dist3(lm[tips[i]], lm[0]) / (dist3(lm[bases[i]], lm[0]) + 0.001);
  }
  return Math.min(1, Math.max(0, (total / 5 - 1.2) / 1.5));
}
