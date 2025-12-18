import { PatternOption, ParticleColor, ParticleSystemConfig } from '@/types/particle';

export const PATTERN_OPTIONS: PatternOption[] = [
  {
    id: 'sphere',
    name: 'Sphere',
    icon: '◉',
    description: 'Classic spherical distribution',
  },
  {
    id: 'helix',
    name: 'Helix',
    icon: '🌀',
    description: 'Spiraling DNA-like structure',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    icon: '🌌',
    description: 'Spiral galaxy formation',
  },
  {
    id: 'cube',
    name: 'Cube',
    icon: '▣',
    description: 'Geometric cube outline',
  },
  {
    id: 'dna',
    name: 'DNA',
    icon: '🧬',
    description: 'Double helix structure',
  },
  {
    id: 'torus',
    name: 'Torus',
    icon: '◯',
    description: 'Donut-shaped ring',
  },
  {
    id: 'heart',
    name: 'Heart',
    icon: '❤️',
    description: 'Heart shape (✌️ gesture)',
  },
  {
    id: 'star',
    name: 'Star',
    icon: '⭐',
    description: '5-point star (👆 gesture)',
  },
];

export const PARTICLE_COLORS: ParticleColor[] = [
  { id: 'cyan', name: 'Electric Cyan', color: '#00f5ff', hsl: [183, 100, 50] },
  { id: 'magenta', name: 'Neon Magenta', color: '#ff00ff', hsl: [300, 100, 50] },
  { id: 'gold', name: 'Solar Gold', color: '#ffd700', hsl: [51, 100, 50] },
  { id: 'lime', name: 'Matrix Green', color: '#39ff14', hsl: [110, 100, 54] },
  { id: 'coral', name: 'Living Coral', color: '#ff6b6b', hsl: [0, 100, 71] },
  { id: 'violet', name: 'Deep Violet', color: '#8b5cf6', hsl: [258, 90, 66] },
  { id: 'rose', name: 'Hot Pink', color: '#ff1493', hsl: [328, 100, 54] },
  { id: 'sky', name: 'Electric Blue', color: '#00bfff', hsl: [195, 100, 50] },
];

export const DEFAULT_CONFIG: ParticleSystemConfig = {
  pattern: 'galaxy',
  color: PARTICLE_COLORS[0],
  particleCount: 8000,
  baseSize: 0.08,
};
