import { PatternType } from '@/types/particle';

export function generatePattern(
  type: PatternType,
  count: number,
  scale: number = 1
): Float32Array {
  const positions = new Float32Array(count * 3);

  switch (type) {
    case 'sphere': generateSphere(positions, count, scale); break;
    case 'helix': generateHelix(positions, count, scale); break;
    case 'galaxy': generateGalaxy(positions, count, scale); break;
    case 'cube': generateCube(positions, count, scale); break;
    case 'dna': generateDNA(positions, count, scale); break;
    case 'torus': generateTorus(positions, count, scale); break;
    case 'heart': generateHeart(positions, count, scale); break;
    case 'love': generateLoveText(positions, count, scale); break;
    default: generateSphere(positions, count, scale);
  }

  return positions;
}

function generateSphere(positions: Float32Array, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * 3 * scale;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
}

function generateHelix(positions: Float32Array, count: number, scale: number) {
  const turns = 5, height = 6 * scale, radius = 2 * scale;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    const rVariation = radius + (Math.random() - 0.5) * 0.5 * scale;
    const noise = (Math.random() - 0.5) * 0.3 * scale;
    positions[i * 3] = Math.cos(angle) * rVariation + noise;
    positions[i * 3 + 1] = y + noise;
    positions[i * 3 + 2] = Math.sin(angle) * rVariation + noise;
  }
}

function generateGalaxy(positions: Float32Array, count: number, scale: number) {
  const arms = 3, spin = 2;
  for (let i = 0; i < count; i++) {
    const armIndex = i % arms;
    const baseAngle = (armIndex / arms) * Math.PI * 2;
    const distance = Math.random() * 4 * scale;
    const spinAmount = distance * spin;
    const angle = baseAngle + spinAmount + (Math.random() - 0.5) * 0.5;
    const armWidth = 0.3 * scale * Math.exp(-distance * 0.3);
    positions[i * 3] = Math.cos(angle) * distance + (Math.random() - 0.5) * armWidth * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2 * scale * Math.exp(-distance * 0.5);
    positions[i * 3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * armWidth * 2;
  }
}

function generateCube(positions: Float32Array, count: number, scale: number) {
  const size = 3 * scale;
  for (let i = 0; i < count; i++) {
    const face = Math.floor(Math.random() * 6);
    let x = 0, y = 0, z = 0;
    switch (face) {
      case 0: x = -0.5; y = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 1: x = 0.5; y = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 2: y = -0.5; x = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 3: y = 0.5; x = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 4: z = -0.5; x = Math.random() - 0.5; y = Math.random() - 0.5; break;
      default: z = 0.5; x = Math.random() - 0.5; y = Math.random() - 0.5; break;
    }
    positions[i * 3] = x * size;
    positions[i * 3 + 1] = y * size;
    positions[i * 3 + 2] = z * size;
  }
}

function generateDNA(positions: Float32Array, count: number, scale: number) {
  const turns = 4, height = 8 * scale, radius = 1.5 * scale;
  for (let i = 0; i < count; i++) {
    const strand = i % 2;
    const t = (i / 2) / (count / 2);
    const angle = t * turns * Math.PI * 2 + strand * Math.PI;
    const y = (t - 0.5) * height;
    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
  }
}

function generateTorus(positions: Float32Array, count: number, scale: number) {
  const majorRadius = 2.5 * scale, minorRadius = 1 * scale;
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    const r = minorRadius * (0.8 + Math.random() * 0.4);
    positions[i * 3] = (majorRadius + r * Math.cos(v)) * Math.cos(u);
    positions[i * 3 + 1] = r * Math.sin(v);
    positions[i * 3 + 2] = (majorRadius + r * Math.cos(v)) * Math.sin(u);
  }
}

function generateHeart(positions: Float32Array, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.cbrt(Math.random()); // Volume distribution
    
    // 3D heart parametric equation
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const z = (Math.random() - 0.5) * 4 * r;
    
    const heartScale = scale * 0.15;
    positions[i * 3] = x * heartScale * r + (Math.random() - 0.5) * 0.3;
    positions[i * 3 + 1] = y * heartScale * r + (Math.random() - 0.5) * 0.3;
    positions[i * 3 + 2] = z * heartScale;
  }
}

function generateLoveText(positions: Float32Array, count: number, scale: number) {
  // Define "I ♥ U" letter shapes with points
  const letters = {
    I: [
      { x: -3, y: 0.8 }, { x: -3, y: 0.4 }, { x: -3, y: 0 }, { x: -3, y: -0.4 }, { x: -3, y: -0.8 },
    ],
    heart: [], // Will be generated
    U: [
      { x: 2.5, y: 0.8 }, { x: 2.5, y: 0.4 }, { x: 2.5, y: 0 }, { x: 2.5, y: -0.4 },
      { x: 2.7, y: -0.7 }, { x: 3, y: -0.8 }, { x: 3.3, y: -0.7 },
      { x: 3.5, y: -0.4 }, { x: 3.5, y: 0 }, { x: 3.5, y: 0.4 }, { x: 3.5, y: 0.8 },
    ]
  };

  // Generate heart points in the middle
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const x = 0.4 * Math.pow(Math.sin(t), 3);
    const y = 0.35 * Math.cos(t) - 0.12 * Math.cos(2 * t) - 0.05 * Math.cos(3 * t) - 0.025 * Math.cos(4 * t);
    letters.heart.push({ x, y: y + 0.1 });
  }

  const allPoints = [...letters.I, ...letters.heart.map(p => ({ x: p.x, y: p.y })), ...letters.U];
  
  for (let i = 0; i < count; i++) {
    const point = allPoints[i % allPoints.length];
    const noise = 0.15;
    positions[i * 3] = point.x * scale + (Math.random() - 0.5) * noise * scale;
    positions[i * 3 + 1] = point.y * scale + (Math.random() - 0.5) * noise * scale;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5 * scale;
  }
}

export function interpolatePositions(
  source: Float32Array,
  target: Float32Array,
  progress: number
): Float32Array {
  const result = new Float32Array(source.length);
  // Use faster easing for more reactive feel
  const smoothProgress = easeOutExpo(progress);
  
  for (let i = 0; i < source.length; i++) {
    result[i] = source[i] + (target[i] - source[i]) * smoothProgress;
  }
  
  return result;
}

// Faster, more reactive easing
function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
