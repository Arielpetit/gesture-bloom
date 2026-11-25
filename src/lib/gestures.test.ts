import { describe, expect, it } from 'vitest';
import { detectGesture, handOpenness, type Landmark } from './gestures';

type Fingers = { thumb: 'out' | 'in' | 'up'; index: boolean; middle: boolean; ring: boolean; pinky: boolean };

/**
 * Builds a synthetic right hand in MediaPipe image coordinates (y grows downward),
 * palm facing the camera, wrist at the bottom. Extended fingers point up; curled
 * fingers fold back toward the wrist.
 */
function hand(f: Fingers): Landmark[] {
  const lm: Landmark[] = new Array(21);
  const wrist = { x: 0.5, y: 0.8, z: 0 };
  lm[0] = wrist;

  // Thumb: 1 CMC, 2 MCP, 3 IP, 4 tip
  lm[1] = { x: 0.44, y: 0.74, z: 0 };
  lm[2] = { x: 0.4, y: 0.7, z: 0 };
  if (f.thumb === 'out') {
    lm[3] = { x: 0.34, y: 0.66, z: 0 };
    lm[4] = { x: 0.28, y: 0.63, z: 0 };
  } else if (f.thumb === 'up') {
    lm[3] = { x: 0.42, y: 0.6, z: 0 };
    lm[4] = { x: 0.42, y: 0.5, z: 0 };
  } else {
    lm[3] = { x: 0.45, y: 0.66, z: 0 };
    lm[4] = { x: 0.49, y: 0.65, z: 0 };
  }

  const columns = [0.44, 0.5, 0.56, 0.62]; // index, middle, ring, pinky
  const extended = [f.index, f.middle, f.ring, f.pinky];
  columns.forEach((x, i) => {
    const base = 5 + i * 4; // MCP, PIP, DIP, TIP
    lm[base] = { x, y: 0.62, z: 0 };
    if (extended[i]) {
      const spread = (i - 1.5) * 0.02;
      lm[base + 1] = { x: x + spread * 0.5, y: 0.52, z: 0 };
      lm[base + 2] = { x: x + spread * 0.8, y: 0.46, z: 0 };
      lm[base + 3] = { x: x + spread, y: 0.4, z: 0 };
    } else {
      lm[base + 1] = { x, y: 0.56, z: 0 };
      lm[base + 2] = { x, y: 0.61, z: 0 };
      lm[base + 3] = { x, y: 0.66, z: 0 };
    }
  });
  return lm;
}

const curled = { index: false, middle: false, ring: false, pinky: false };

describe('detectGesture', () => {
  it('open hand', () => {
    expect(detectGesture(hand({ thumb: 'out', index: true, middle: true, ring: true, pinky: true }))).toBe('open');
  });

  it('fist', () => {
    expect(detectGesture(hand({ thumb: 'in', ...curled }))).toBe('fist');
  });

  it('peace sign', () => {
    expect(detectGesture(hand({ thumb: 'in', ...curled, index: true, middle: true }))).toBe('peace');
  });

  it('pointing', () => {
    expect(detectGesture(hand({ thumb: 'in', ...curled, index: true }))).toBe('pointing');
  });

  it('rock, even with the thumb out', () => {
    expect(detectGesture(hand({ thumb: 'in', ...curled, index: true, pinky: true }))).toBe('rock');
    expect(detectGesture(hand({ thumb: 'out', ...curled, index: true, pinky: true }))).toBe('rock');
  });

  it('call me', () => {
    expect(detectGesture(hand({ thumb: 'out', ...curled, pinky: true }))).toBe('callMe');
  });

  it('thumbs up', () => {
    expect(detectGesture(hand({ thumb: 'up', ...curled }))).toBe('thumbUp');
  });

  it('middle finger', () => {
    expect(detectGesture(hand({ thumb: 'in', ...curled, middle: true }))).toBe('middleFinger');
  });

  it('OK sign: thumb and index tips touch, other fingers up', () => {
    const lm = hand({ thumb: 'in', index: false, middle: true, ring: true, pinky: true });
    lm[4] = { x: 0.44, y: 0.55, z: 0 };
    lm[8] = { x: 0.45, y: 0.56, z: 0 };
    expect(detectGesture(lm)).toBe('okSign');
  });
});

describe('handOpenness', () => {
  it('is higher for an open hand than a fist', () => {
    const open = handOpenness(hand({ thumb: 'out', index: true, middle: true, ring: true, pinky: true }));
    const fist = handOpenness(hand({ thumb: 'in', ...curled }));
    expect(open).toBeGreaterThan(fist);
    expect(open).toBeGreaterThanOrEqual(0);
    expect(open).toBeLessThanOrEqual(1);
  });
});
