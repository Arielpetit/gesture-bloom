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
    case 'star': generateStar(positions, count, scale); break;
    case 'burst': generateBurst(positions, count, scale); break;
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
  const turns = 5;
  const height = 6 * scale;
  const radius = 2 * scale;

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
  const arms = 3;
  const spin = 2;

  for (let i = 0; i < count; i++) {
    const armIndex = i % arms;
    const baseAngle = (armIndex / arms) * Math.PI * 2;
    const distance = Math.random() * 4 * scale;
    const spinAmount = distance * spin;
    const angle = baseAngle + spinAmount + (Math.random() - 0.5) * 0.5;
    const armWidth = 0.3 * scale * Math.exp(-distance * 0.3);
    const offsetX = (Math.random() - 0.5) * armWidth * 2;
    const offsetZ = (Math.random() - 0.5) * armWidth * 2;
    const offsetY = (Math.random() - 0.5) * 0.2 * scale * Math.exp(-distance * 0.5);

    positions[i * 3] = Math.cos(angle) * distance + offsetX;
    positions[i * 3 + 1] = offsetY;
    positions[i * 3 + 2] = Math.sin(angle) * distance + offsetZ;
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
  const turns = 4;
  const height = 8 * scale;
  const radius = 1.5 * scale;
  const half = Math.floor(count / 2);

  for (let i = 0; i < half; i++) {
    const t = i / half;
    const angle = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    
    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
  }

  for (let i = half; i < count; i++) {
    const t = (i - half) / half;
    const angle = t * turns * Math.PI * 2 + Math.PI;
    const y = (t - 0.5) * height;
    
    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
  }
}

function generateTorus(positions: Float32Array, count: number, scale: number) {
  const majorRadius = 2.5 * scale;
  const minorRadius = 1 * scale;

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
  const s = 2.5 * scale;
  
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    // Parametric heart equation
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Add some depth and noise for 3D effect
    const depth = (Math.random() - 0.5) * 2 * scale;
    const noise = Math.random() * 0.3 * scale;
    
    positions[i * 3] = (x / 16) * s + (Math.random() - 0.5) * noise;
    positions[i * 3 + 1] = (y / 16) * s + (Math.random() - 0.5) * noise;
    positions[i * 3 + 2] = depth;
  }
}

function generateLoveText(positions: Float32Array, count: number, scale: number) {
  const s = scale * 0.4;
  const spacing = 2.2 * s;
  
  // Define letter shapes with points
  const letters: { [key: string]: [number, number][] } = {
    'I': [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    'heart': [], // Generated separately
    'U': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1], [2, 0]],
  };
  
  // Generate heart points
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const hx = Math.sin(t) * Math.cos(t) * Math.log(Math.abs(t) + 0.1);
    const hy = Math.sqrt(Math.abs(t)) * Math.cos(t);
    letters['heart'].push([hx * 1.5 + 1, hy * 1.5 + 2]);
  }
  
  const particlesPerSection = Math.floor(count / 3);
  let idx = 0;
  
  // I
  const iPoints = letters['I'];
  for (let i = 0; i < particlesPerSection && idx < count; i++) {
    const pt = iPoints[Math.floor(Math.random() * iPoints.length)];
    positions[idx * 3] = (pt[0] - 5) * s + (Math.random() - 0.5) * 0.3 * s;
    positions[idx * 3 + 1] = (2 - pt[1]) * s + (Math.random() - 0.5) * 0.3 * s;
    positions[idx * 3 + 2] = (Math.random() - 0.5) * s;
    idx++;
  }
  
  // Heart (center)
  for (let i = 0; i < particlesPerSection && idx < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    positions[idx * 3] = (hx / 20) * s + (Math.random() - 0.5) * 0.2 * s;
    positions[idx * 3 + 1] = (hy / 20) * s + (Math.random() - 0.5) * 0.2 * s;
    positions[idx * 3 + 2] = (Math.random() - 0.5) * s * 0.5;
    idx++;
  }
  
  // U
  const uPoints = letters['U'];
  for (let i = 0; i < particlesPerSection && idx < count; i++) {
    const pt = uPoints[Math.floor(Math.random() * uPoints.length)];
    positions[idx * 3] = (pt[0] + 3) * s + (Math.random() - 0.5) * 0.3 * s;
    positions[idx * 3 + 1] = (2 - pt[1]) * s + (Math.random() - 0.5) * 0.3 * s;
    positions[idx * 3 + 2] = (Math.random() - 0.5) * s;
    idx++;
  }
  
  // Fill remaining
  while (idx < count) {
    const section = idx % 3;
    if (section === 0) {
      positions[idx * 3] = -5 * s + (Math.random() - 0.5) * s;
    } else if (section === 1) {
      positions[idx * 3] = (Math.random() - 0.5) * 2 * s;
    } else {
      positions[idx * 3] = 4 * s + (Math.random() - 0.5) * s;
    }
    positions[idx * 3 + 1] = (Math.random() - 0.5) * 4 * s;
    positions[idx * 3 + 2] = (Math.random() - 0.5) * s;
    idx++;
  }
}

function generateStar(positions: Float32Array, count: number, scale: number) {
  const points = 5;
  const outerRadius = 3 * scale;
  const innerRadius = 1.2 * scale;
  
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const pointIndex = Math.floor(Math.random() * points);
    const angle1 = (pointIndex / points) * Math.PI * 2 - Math.PI / 2;
    const angle2 = ((pointIndex + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
    
    const r1 = outerRadius;
    const r2 = innerRadius;
    
    // Interpolate between outer and inner points
    const x1 = Math.cos(angle1) * r1;
    const y1 = Math.sin(angle1) * r1;
    const x2 = Math.cos(angle2) * r2;
    const y2 = Math.sin(angle2) * r2;
    
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.3 * scale;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 0.3 * scale;
    const z = (Math.random() - 0.5) * scale;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
}

function generateBurst(positions: Float32Array, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // Burst pattern: concentrated at center with rays shooting out
    const r = Math.pow(Math.random(), 0.3) * 4 * scale;
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
}

export function interpolatePositions(
  source: Float32Array,
  target: Float32Array,
  progress: number
): Float32Array {
  const result = new Float32Array(source.length);
  const smoothProgress = smoothstep(0, 1, progress);
  
  for (let i = 0; i < source.length; i++) {
    result[i] = source[i] + (target[i] - source[i]) * smoothProgress;
  }
  
  return result;
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
