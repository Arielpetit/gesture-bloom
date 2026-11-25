// Copies the MediaPipe Hands runtime (JS + WASM + model) from node_modules into
// public/mediapipe so the app serves it itself: no CDN, works offline via the service worker.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const out = 'public/mediapipe';
const sources = [
  ['node_modules/@mediapipe/hands', 'hands', /\.(js|wasm|data|binarypb|tflite)$/],
  ['node_modules/@mediapipe/camera_utils', 'camera_utils', /^camera_utils\.js$/],
];

for (const [src, dest, pattern] of sources) {
  const target = join(out, dest);
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(src)) {
    if (!pattern.test(file)) continue;
    const to = join(target, file);
    if (!existsSync(to)) cpSync(join(src, file), to);
  }
}
console.log('MediaPipe assets ready in', out);
