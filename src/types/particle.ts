export type PatternType = 'sphere' | 'helix' | 'galaxy' | 'cube' | 'dna' | 'torus' | 'heart' | 'love';

export type GestureType = 'none' | 'open' | 'fist' | 'peace' | 'pointing' | 'rock' | 'iLoveYou' | 'callMe' | 'middleFinger';

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
  landmarks?: { x: number; y: number; z: number }[];
}

export interface ParticleSystemConfig {
  pattern: PatternType;
  color: ParticleColor;
  particleCount: number;
  baseSize: number;
}
