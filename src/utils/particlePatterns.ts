import * as THREE from 'three';
import { PatternType } from '@/types/particle';

export function generatePattern(
  type: PatternType,
  count: number,
  scale: number = 1
): Float32Array {
  const positions = new Float32Array(count * 3);

  switch (type) {
    case 'sphere':
      generateSphere(positions, count, scale);
      break;
    case 'helix':
      generateHelix(positions, count, scale);
      break;
    case 'galaxy':
      generateGalaxy(positions, count, scale);
      break;
    case 'cube':
      generateCube(positions, count, scale);
      break;
    case 'dna':
      generateDNA(positions, count, scale);
      break;
    case 'torus':
      generateTorus(positions, count, scale);
      break;
    default:
      generateSphere(positions, count, scale);
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
    
    // Add some randomness
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
    
    // Exponential falloff for arm thickness
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
  const edgeParticles = Math.floor(count * 0.4);
  const faceParticles = Math.floor(count * 0.4);
  const volumeParticles = count - edgeParticles - faceParticles;

  let index = 0;

  // Edge particles
  const edges = [
    // Bottom face edges
    [[0, 0, 0], [1, 0, 0]], [[1, 0, 0], [1, 0, 1]], [[1, 0, 1], [0, 0, 1]], [[0, 0, 1], [0, 0, 0]],
    // Top face edges
    [[0, 1, 0], [1, 1, 0]], [[1, 1, 0], [1, 1, 1]], [[1, 1, 1], [0, 1, 1]], [[0, 1, 1], [0, 1, 0]],
    // Vertical edges
    [[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 0]], [[1, 0, 1], [1, 1, 1]], [[0, 0, 1], [0, 1, 1]],
  ];

  for (let i = 0; i < edgeParticles && index < count; i++) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const t = Math.random();
    const x = (edge[0][0] + (edge[1][0] - edge[0][0]) * t - 0.5) * size;
    const y = (edge[0][1] + (edge[1][1] - edge[0][1]) * t - 0.5) * size;
    const z = (edge[0][2] + (edge[1][2] - edge[0][2]) * t - 0.5) * size;
    
    positions[index * 3] = x + (Math.random() - 0.5) * 0.1 * scale;
    positions[index * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[index * 3 + 2] = z + (Math.random() - 0.5) * 0.1 * scale;
    index++;
  }

  // Face particles
  for (let i = 0; i < faceParticles && index < count; i++) {
    const face = Math.floor(Math.random() * 6);
    let x, y, z;
    
    switch (face) {
      case 0: x = -0.5; y = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 1: x = 0.5; y = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 2: y = -0.5; x = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 3: y = 0.5; x = Math.random() - 0.5; z = Math.random() - 0.5; break;
      case 4: z = -0.5; x = Math.random() - 0.5; y = Math.random() - 0.5; break;
      default: z = 0.5; x = Math.random() - 0.5; y = Math.random() - 0.5; break;
    }
    
    positions[index * 3] = x * size;
    positions[index * 3 + 1] = y * size;
    positions[index * 3 + 2] = z * size;
    index++;
  }

  // Volume particles
  for (let i = 0; i < volumeParticles && index < count; i++) {
    positions[index * 3] = (Math.random() - 0.5) * size * 0.8;
    positions[index * 3 + 1] = (Math.random() - 0.5) * size * 0.8;
    positions[index * 3 + 2] = (Math.random() - 0.5) * size * 0.8;
    index++;
  }
}

function generateDNA(positions: Float32Array, count: number, scale: number) {
  const turns = 4;
  const height = 8 * scale;
  const radius = 1.5 * scale;
  const particlesPerStrand = Math.floor(count * 0.4);
  const bridgeParticles = count - particlesPerStrand * 2;

  let index = 0;

  // First strand
  for (let i = 0; i < particlesPerStrand && index < count; i++) {
    const t = i / particlesPerStrand;
    const angle = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    
    positions[index * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    positions[index * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[index * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    index++;
  }

  // Second strand (offset by PI)
  for (let i = 0; i < particlesPerStrand && index < count; i++) {
    const t = i / particlesPerStrand;
    const angle = t * turns * Math.PI * 2 + Math.PI;
    const y = (t - 0.5) * height;
    
    positions[index * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    positions[index * 3 + 1] = y + (Math.random() - 0.5) * 0.1 * scale;
    positions[index * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.2 * scale;
    index++;
  }

  // Bridge particles
  const bridgesCount = Math.floor(turns * 10);
  const particlesPerBridge = Math.floor(bridgeParticles / bridgesCount);
  
  for (let b = 0; b < bridgesCount && index < count; b++) {
    const t = b / bridgesCount;
    const angle = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    
    for (let p = 0; p < particlesPerBridge && index < count; p++) {
      const bridgeT = p / particlesPerBridge;
      const currentAngle = angle + bridgeT * Math.PI;
      const r = radius * (1 - Math.abs(bridgeT - 0.5) * 0.3);
      
      positions[index * 3] = Math.cos(currentAngle) * r;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(currentAngle) * r;
      index++;
    }
  }
}

function generateTorus(positions: Float32Array, count: number, scale: number) {
  const majorRadius = 2.5 * scale;
  const minorRadius = 1 * scale;

  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    
    // Add some variation to minor radius
    const r = minorRadius * (0.8 + Math.random() * 0.4);
    
    positions[i * 3] = (majorRadius + r * Math.cos(v)) * Math.cos(u);
    positions[i * 3 + 1] = r * Math.sin(v);
    positions[i * 3 + 2] = (majorRadius + r * Math.cos(v)) * Math.sin(u);
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
