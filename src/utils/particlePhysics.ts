// Simplex noise implementation for turbulence
class SimplexNoise {
  private perm: number[] = [];
  
  constructor(seed: number = Math.random()) {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Shuffle with seed
    let n = seed * 256;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = Math.floor((n / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }
  
  noise3D(x: number, y: number, z: number): number {
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;
    
    let i1, j1, k1, i2, j2, k2;
    
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;
    
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad(this.perm[ii + this.perm[jj + this.perm[kk]]], x0, y0, z0);
    }
    
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad(this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]], x1, y1, z1);
    }
    
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad(this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]], x2, y2, z2);
    }
    
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * this.grad(this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]], x3, y3, z3);
    }
    
    return 32 * (n0 + n1 + n2 + n3);
  }
  
  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

const noise = new SimplexNoise(42);

export interface ParticleVelocity {
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
}

export function createVelocityArrays(count: number): ParticleVelocity {
  return {
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    vz: new Float32Array(count),
  };
}

export function applyPhysics(
  positions: Float32Array,
  velocities: ParticleVelocity,
  basePositions: Float32Array,
  handPosition: { x: number; y: number } | null,
  handVelocity: { x: number; y: number },
  openness: number,
  time: number,
  config: {
    attractionStrength: number;
    turbulenceIntensity: number;
    velocityDamping: number;
    noiseScale: number;
    returnStrength: number;
  }
) {
  const count = positions.length / 3;
  const { attractionStrength, turbulenceIntensity, velocityDamping, noiseScale, returnStrength } = config;
  
  // Convert hand position from normalized (0-1) to 3D space
  const handX = handPosition ? (0.5 - handPosition.x) * 10 : 0;
  const handY = handPosition ? (0.5 - handPosition.y) * 10 : 0;
  const handZ = 0;
  
  // Hand velocity influence
  const handVelMag = Math.sqrt(handVelocity.x * handVelocity.x + handVelocity.y * handVelocity.y);
  const turbulenceBoost = 1 + handVelMag * 2;
  
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];
    const z = positions[idx + 2];
    
    // Base position attraction (return force)
    const baseX = basePositions[idx];
    const baseY = basePositions[idx + 1];
    const baseZ = basePositions[idx + 2];
    
    const toBaseX = baseX - x;
    const toBaseY = baseY - y;
    const toBaseZ = baseZ - z;
    
    // Turbulence from noise
    const noiseX = noise.noise3D(x * noiseScale + time * 0.5, y * noiseScale, z * noiseScale);
    const noiseY = noise.noise3D(x * noiseScale, y * noiseScale + time * 0.5, z * noiseScale + 100);
    const noiseZ = noise.noise3D(x * noiseScale + 200, y * noiseScale, z * noiseScale + time * 0.5);
    
    // Hand attraction/repulsion
    let handForceX = 0, handForceY = 0, handForceZ = 0;
    
    if (handPosition) {
      const toHandX = handX - x;
      const toHandY = handY - y;
      const toHandZ = handZ - z;
      const distToHand = Math.sqrt(toHandX * toHandX + toHandY * toHandY + toHandZ * toHandZ) + 0.1;
      
      // Openness controls attraction vs repulsion
      // Open hand (1) = attract, Closed fist (0) = repel strongly
      const forceDir = openness > 0.5 ? 1 : -1;
      const forceMag = attractionStrength * (1 - openness * 0.5) / (distToHand * distToHand);
      
      handForceX = (toHandX / distToHand) * forceMag * forceDir;
      handForceY = (toHandY / distToHand) * forceMag * forceDir;
      handForceZ = (toHandZ / distToHand) * forceMag * forceDir * 0.3;
      
      // Add hand velocity influence
      handForceX += handVelocity.x * 0.1;
      handForceY += -handVelocity.y * 0.1;
    }
    
    // Apply forces to velocity
    velocities.vx[i] += toBaseX * returnStrength + noiseX * turbulenceIntensity * turbulenceBoost + handForceX;
    velocities.vy[i] += toBaseY * returnStrength + noiseY * turbulenceIntensity * turbulenceBoost + handForceY;
    velocities.vz[i] += toBaseZ * returnStrength + noiseZ * turbulenceIntensity * turbulenceBoost + handForceZ;
    
    // Apply damping
    velocities.vx[i] *= velocityDamping;
    velocities.vy[i] *= velocityDamping;
    velocities.vz[i] *= velocityDamping;
    
    // Clamp velocities
    const maxVel = 0.5;
    velocities.vx[i] = Math.max(-maxVel, Math.min(maxVel, velocities.vx[i]));
    velocities.vy[i] = Math.max(-maxVel, Math.min(maxVel, velocities.vy[i]));
    velocities.vz[i] = Math.max(-maxVel, Math.min(maxVel, velocities.vz[i]));
    
    // Update positions
    positions[idx] += velocities.vx[i];
    positions[idx + 1] += velocities.vy[i];
    positions[idx + 2] += velocities.vz[i];
  }
}

export function applyBurstEffect(
  positions: Float32Array,
  velocities: ParticleVelocity,
  centerX: number,
  centerY: number,
  strength: number
) {
  const count = positions.length / 3;
  
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const dx = positions[idx] - centerX;
    const dy = positions[idx + 1] - centerY;
    const dz = positions[idx + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
    
    const force = strength / (dist * dist);
    velocities.vx[i] += (dx / dist) * force;
    velocities.vy[i] += (dy / dist) * force;
    velocities.vz[i] += (dz / dist) * force * 0.5;
  }
}

export function applyGravityDrop(
  velocities: ParticleVelocity,
  strength: number
) {
  const count = velocities.vy.length;
  
  for (let i = 0; i < count; i++) {
    velocities.vy[i] -= strength;
  }
}
