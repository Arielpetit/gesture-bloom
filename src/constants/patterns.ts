import { PatternOption, ParticleColor } from '@/types/particle';

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
    icon: '⟳',
    description: 'Spiral DNA-like structure',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    icon: '✦',
    description: 'Swirling cosmic formation',
  },
  {
    id: 'cube',
    name: 'Cube',
    icon: '◇',
    description: 'Geometric cubic lattice',
  },
  {
    id: 'dna',
    name: 'DNA',
    icon: '⧗',
    description: 'Double helix structure',
  },
  {
    id: 'torus',
    name: 'Torus',
    icon: '◎',
    description: 'Donut-shaped ring',
  },
];

export const PARTICLE_COLORS: ParticleColor[] = [
  { id: 'cyan', name: 'Electric Cyan', color: '#00e5ff', hsl: [190, 100, 50] },
  { id: 'magenta', name: 'Neon Magenta', color: '#ff00ff', hsl: [300, 100, 50] },
  { id: 'gold', name: 'Solar Gold', color: '#ffd700', hsl: [51, 100, 50] },
  { id: 'emerald', name: 'Matrix Green', color: '#00ff88', hsl: [153, 100, 50] },
  { id: 'violet', name: 'Deep Violet', color: '#8b5cf6', hsl: [258, 90, 66] },
  { id: 'white', name: 'Pure White', color: '#ffffff', hsl: [0, 0, 100] },
  { id: 'coral', name: 'Living Coral', color: '#ff6b6b', hsl: [0, 100, 71] },
  { id: 'azure', name: 'Deep Azure', color: '#0099ff', hsl: [204, 100, 50] },
];

export const DEFAULT_CONFIG = {
  pattern: 'sphere' as const,
  color: PARTICLE_COLORS[0],
  particleCount: 5000,
  baseSize: 2,
};
