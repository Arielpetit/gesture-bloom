import { PatternType } from '@/types/particle';

export function generatePattern(
  type: PatternType,
  count: number,
  scale: number = 1,
  customLines?: string[]
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
    case 'victoryHeart': generateVictoryHeart(positions, count, scale, customLines ?? ['JE T\'AIME !', '❤️']); break;
    case 'love': generateLoveText(positions, count, scale); break;
    case 'ambient': generateAmbientCloud(positions, count, scale); break;
    case 'wordArrival': generateTextPattern(positions, count, scale, customLines ?? ['Certaines personnes', 'arrivent sans prevenir']); break;
    case 'wordMoments': generateTextPattern(positions, count, scale, customLines ?? ['Tu rends', 'mes moments plus beaux']); break;
    case 'wordSimple': generateTextPattern(positions, count, scale, customLines ?? ['Avec toi', 'tout est plus simple']); break;
    case 'wordEnergy': generateTextPattern(positions, count, scale, customLines ?? ['J aime', 'ton energie']); break;
    case 'wordFromMe': generateTextPattern(positions, count, scale, customLines ?? ['Je voulais creer', 'quelque chose de moi']); break;
    case 'wordQuestion': generateTextPattern(positions, count, scale, customLines ?? ['Veux-tu etre', 'ma petite amie ?']); break;
    default: generateSphere(positions, count, scale);
  }

  return positions;
}

function generateAmbientCloud(positions: Float32Array, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = (1.2 + Math.random() * 3.9) * scale;
    const drift = (Math.random() - 0.5) * 3.6 * scale;

    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 2.2 * scale;
    positions[i * 3 + 1] = drift;
    positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 2.2 * scale;
  }
}

function generateSphere(positions: Float32Array, count: number, scale: number) {
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * 3.55 * scale;
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
    const r = Math.sqrt(Math.random()); // More uniform distribution
    
    // Heart shape parametric equations
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Create a 3D volume by adding depth that is "puffer" in the middle
    // and tapers off at the edges
    const distFromCenter = r;
    const depth = Math.sqrt(Math.max(0, 1 - distFromCenter * distFromCenter)) * 8;
    const z = (Math.random() - 0.5) * depth;

    const heartScale = scale * 0.15;
    positions[i * 3] = x * heartScale * r;
    positions[i * 3 + 1] = y * heartScale * r;
    positions[i * 3 + 2] = z * heartScale;
  }
}

function generateLoveText(positions: Float32Array, count: number, scale: number) {
  const points: { x: number; y: number }[] = [];

  // Helper to add a line of points
  const addLine = (x1: number, y1: number, x2: number, y2: number, numPoints: number) => {
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t
      });
    }
  };

  // Helper for curves
  const addCurve = (cx: number, cy: number, rx: number, ry: number, start: number, end: number, numPoints: number) => {
    for (let i = 0; i < numPoints; i++) {
      const t = start + (end - start) * (i / numPoints);
      points.push({
        x: cx + Math.cos(t) * rx,
        y: cy + Math.sin(t) * ry
      });
    }
  };

  // --- "I" ---
  addLine(-6.5, 1.0, -6.5, -1.0, 30);
  addLine(-7.0, 1.0, -6.0, 1.0, 15);
  addLine(-7.0, -1.0, -6.0, -1.0, 15);

  // --- "love" ---
  // l
  addLine(-4.5, 1.0, -4.5, -1.0, 30);
  // o
  addCurve(-3.0, 0, 0.6, 0.8, 0, Math.PI * 2, 40);
  // v
  addLine(-2.0, 0.8, -1.5, -1.0, 25);
  addLine(-1.5, -1.0, -1.0, 0.8, 25);
  // e
  addCurve(0.2, 0, 0.6, 0.8, 0, Math.PI * 1.5, 30);
  addLine(0.2, 0, 0.8, 0, 15);

  // --- "you" ---
  // y
  addLine(2.0, 0.8, 2.5, -0.2, 20);
  addLine(3.0, 0.8, 2.5, -0.2, 20);
  addLine(2.5, -0.2, 2.0, -1.5, 20);
  // o
  addCurve(4.5, 0, 0.6, 0.8, 0, Math.PI * 2, 40);
  // u
  addLine(5.8, 0.8, 5.8, -0.5, 20);
  addCurve(6.5, -0.5, 0.7, 0.5, Math.PI, Math.PI * 2, 20);
  addLine(7.2, -0.5, 7.2, 0.8, 20);

  const textScale = scale * 0.7;
  for (let i = 0; i < count; i++) {
    const basePoint = points[i % points.length];
    const noise = 0.15;

    positions[i * 3] = basePoint.x * textScale + (Math.random() - 0.5) * noise;
    positions[i * 3 + 1] = basePoint.y * textScale + (Math.random() - 0.5) * noise;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
}

function generateTextPattern(positions: Float32Array, count: number, scale: number, lines: string[]) {
  const points = sampleTextPoints(lines);

  if (points.length === 0) {
    generateSphere(positions, count, scale);
    return;
  }

  const textScale = scale * 5.2; // Slightly larger text
  const depth = scale * 0.24; // Thinner depth for better front-facing clarity

  for (let i = 0; i < count; i++) {
    const basePoint = points[Math.floor(Math.random() * points.length)];
    const noise = 0.012; // Extremely low noise for sharpest possible letters

    positions[i * 3] = basePoint.x * textScale + (Math.random() - 0.5) * noise;
    positions[i * 3 + 1] = basePoint.y * textScale + (Math.random() - 0.5) * noise;
    positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
  }
}

function sampleTextPoints(lines: string[]) {
  const canvas = document.createElement('canvas');
  const width = 1400;
  const height = 650; // Increased for better breathing room
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const finalLines: string[] = [];
  const maxWidth = width * 0.88;
  
  ctx.font = `800 120px Outfit, Arial, sans-serif`; // Base font for measuring
  lines.forEach(line => {
    if (ctx.measureText(line).width > maxWidth) {
      finalLines.push(...wrapText(line, maxWidth));
    } else {
      finalLines.push(line);
    }
  });

   const fontSize = finalLines.length > 3 ? 85 : finalLines.length > 2 ? 100 : finalLines.length > 1 ? 135 : 180;
  const lineHeight = fontSize * 1.05;
  const startY = height / 2 - ((finalLines.length - 1) * lineHeight) / 2;

  finalLines.forEach((line, index) => {
    let fittedSize = fontSize;
    ctx.font = `800 ${fittedSize}px Outfit, Arial, sans-serif`;

    while (ctx.measureText(line).width > maxWidth && fittedSize > 60) {
      fittedSize -= 5;
      ctx.font = `800 ${fittedSize}px Outfit, Arial, sans-serif`;
    }

    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  const data = ctx.getImageData(0, 0, width, height).data;
  const points: { x: number; y: number }[] = [];
  const step = 4; // Denser sampling for better readability

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 80) {
        points.push({
          x: (x / width - 0.5) * 2,
          y: -(y / height - 0.5) * 1.25,
        });
      }
    }
  }

  return points;
}

function generateVictoryHeart(positions: Float32Array, count: number, scale: number, lines: string[]) {
  // Use 55% particles for the heart outline and 45% for the text inside
  const heartCount = Math.floor(count * 0.55);
  const textCount = count - heartCount;

  // 1. Generate Heart Outline
  for (let i = 0; i < heartCount; i++) {
    const t = Math.random() * Math.PI * 2;
    // Heart equation
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // Scale up the heart to be a border
    positions[i * 3] = x * scale * 0.6;
    positions[i * 3 + 1] = y * scale * 0.6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }

  // 2. Generate Text inside
  const textPositions = new Float32Array(textCount * 3);
  generateTextPattern(textPositions, textCount, scale * 0.75, lines);
  
  for (let i = 0; i < textCount; i++) {
    const idx = (heartCount + i) * 3;
    positions[idx] = textPositions[i * 3];
    positions[idx + 1] = textPositions[i * 3 + 1] - 1.0; 
    positions[idx + 2] = textPositions[i * 3 + 2];
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
