export type PatternType = 'sphere' | 'helix' | 'galaxy' | 'cube' | 'dna' | 'torus' | 'heart' | 'love' | 'star' | 'burst';

export type GestureType = 'none' | 'open' | 'fist' | 'peace' | 'thumbsUp' | 'love' | 'point';

export interface PatternOption {
  id: PatternType;
  name: string;
  icon: string;
  description: string;
}

export interface ParticleColor {
  id: string;
  name: string;
  color: string;
  hsl: [number, number, number];
}

export interface HandGestureState {
  isDetected: boolean;
  openness: number; // 0 = closed fist, 1 = fully open
  position: { x: number; y: number } | null;
  gesture: GestureType;
  velocity: { x: number; y: number }; // Hand movement speed
  depth: number; // Z-axis depth (0-1)
  confidence: number; // Detection confidence (0-1)
}

export interface ParticleSystemConfig {
  pattern: PatternType;
  color: ParticleColor;
  particleCount: number;
  baseSize: number;
}

export interface PhysicsConfig {
  attractionStrength: number;
  repulsionStrength: number;
  turbulenceIntensity: number;
  velocityDamping: number;
  noiseScale: number;
}
