import { generatePattern } from './particlePatterns';

/** A user-made particle target: sample points (xyz) and optional per-point colors (rgb 0..1). */
export interface ParticleShape {
  id: string;
  label: string;
  points: Float32Array;
  colors?: Float32Array;
  /** Flat shapes face the camera and stop spinning, like text. */
  flat: boolean;
}

let nextId = 0;

export function shapeFromText(text: string): ParticleShape {
  const clean = text.trim().slice(0, 60) || 'Hello';
  return {
    id: `text-${nextId++}`,
    label: clean,
    points: generatePattern('wordSimple', 8000, 1, [clean]),
    flat: true,
  };
}

const MAX_SIDE = 200;
const WORLD_WIDTH = 7.5;

/** Turn an image file into particle targets, keeping its colors. Dark/transparent pixels are skipped. */
export async function shapeFromImage(file: File): Promise<ParticleShape> {
  if (!file.type.startsWith('image/')) throw new Error('Please drop an image file.');
  const bitmap = await createImageBitmap(file);
  const s = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * s));
  const h = Math.max(1, Math.round(bitmap.height * s));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const data = ctx.getImageData(0, 0, w, h).data;

  const collect = (minLum: number) => {
    const pts: number[] = [];
    const cols: number[] = [];
    const unit = WORLD_WIDTH / Math.max(w, h * 1.2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 128) continue;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < minLum) continue;
        pts.push((x - w / 2) * unit, -(y - h / 2) * unit, (lum - 0.5) * 0.6);
        // Lift the colors a little: additive points look washed out otherwise.
        cols.push(Math.min(1, r * 1.1), Math.min(1, g * 1.1), Math.min(1, b * 1.1));
      }
    }
    return { pts, cols };
  };

  let { pts, cols } = collect(0.12);
  if (pts.length < 200) ({ pts, cols } = collect(0));
  if (pts.length === 0) throw new Error('That image looks empty.');

  return {
    id: `img-${nextId++}`,
    label: file.name,
    points: new Float32Array(pts),
    colors: new Float32Array(cols),
    flat: true,
  };
}
